<?php

namespace App\Controller;

use App\Security\LoginFormAuthenticator;
use App\Service\YouSignAPI;
use Doctrine\ORM\EntityManagerInterface;
use Knp\Snappy\Pdf;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\RepeatedType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Constraints\File as FileConstraint;
use Symfony\Component\Validator\Constraints\GreaterThanOrEqual;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Contracts\Translation\TranslatorInterface;
use Symfony\Component\Validator\Constraints as Assert;

class OuvertureCompteController extends AbstractController
{
    const SURTITRE = "Ouverture de votre compte eusko";
    const NB_ETAPES = 8;

    #[Route(path: '/{_locale}/ouverture-compte', name: 'app_ouverture_etape1_identite')]
    public function etape1Identite(Request $request, TranslatorInterface $translator, SessionInterface $session, APIToolbox $APIToolbox)
    {
        $session->start();
        $session->set('utilisateur', []);

        // Le paramètre optionnel "token" permet de charger le formulaire pour un adhérent existant.
        $member = null;
        $token = $request->query->get('token');
        $response = $APIToolbox->curlWithoutToken('GET', '/members/?token='.$token);
        if ($response['httpcode'] == 200) {
            $member = $response['data'][0];
        }

        $formBuilder = $this->createFormBuilder();

        // Si on connait déjà l'utilisateur, on affiche le numéro d'adhérent dans le formulaire en lecture seule
        if ($member) {
            $formBuilder->add('login', TextType::class, [
                'label' => $translator->trans("N° d'adhérent"),
                'required' => true,
                'attr' => [ 'readonly' => true ],
                'data' => $member->login,
            ]);
        }
        $formBuilder
            ->add('lastname', TextType::class, [
                'label' => $translator->trans('identite.nom'),
                'required' => true,
                'constraints' => [ new NotBlank() ],
                'data' => ($member == null) ? '' : $member->lastname,
            ])
            ->add('firstname', TextType::class, [
                'label' => $translator->trans('identite.prenom'),
                'required' => true,
                'constraints' => [ new NotBlank() ],
                'data' => ($member == null) ? '' : $member->firstname,
            ])
            ->add('email', EmailType::class, [
                'label' => $translator->trans('identite.email'),
                'required' => true,
                'constraints' => [ new NotBlank() ],
                'data' => ($member == null) ? '' : $member->email,
            ])
            ->add('valide', CheckboxType::class, ['label' => " ", 'required' => true])
            ->add('submit', SubmitType::class, ['label' => 'Valider']);
        $form = $formBuilder->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();

            if (!$member) {
                //Vérifier l'existance d'un compte dans dolibarr, si l'utilisateur existe un email est envoyé contenant
                //le jeton d'authentification
                $response = $APIToolbox->curlWithoutToken(
                    'POST',
                    '/verifier-existence-compte/',
                    ['email' => $data["email"], 'type' => 'compte', "language" => $request->getLocale()]
                );
                if ($response['httpcode'] == 200) {
                    return $this->render('ouverture_compte/attente_reception_email.html.twig', [
                        'surtitre' => $translator->trans(OuvertureCompteController::SURTITRE),
                        'numero_etape' => 1,
                        'nb_etapes' => OuvertureCompteController::NB_ETAPES,
                        'titre' => $translator->trans('attente_reception.titre'),
                        'explication' => $translator->trans('attente_reception.explication')
                    ]);
                }
            }

            $session->set('utilisateur', $data);
            $session->set('compteur', 1);

            return $this->redirectToRoute('app_compte_etape2_coordonnees');

        }

        return $this->render('ouverture_compte/etape_identite.html.twig', [
            'surtitre' => $translator->trans(OuvertureCompteController::SURTITRE),
            'numero_etape' => 1,
            'nb_etapes' => OuvertureCompteController::NB_ETAPES,
            'titre' => $translator->trans('identite.titre'),
            'explication' => $translator->trans('identite.explication'),
            'form' => $form
        ]);
    }

    #[Route(path: '/{_locale}/ouverture-compte/coordonnees', name: 'app_compte_etape2_coordonnees')]
    public function etape2Coordonnees(APIToolbox $APIToolbox, Request $request, SessionInterface $session, TranslatorInterface $translator)
    {
        $session->start();

        $responseCountries = $APIToolbox->curlWithoutToken('GET', '/countries/');
        $tabCountries = [];
        foreach ($responseCountries['data'] as $country){
            if($country->label != '-'){
                $tabCountries[$country->label] = $country->id;
            }
        }

        $form = $this->createFormBuilder(null, ['attr' => ['id' => 'coordonnees']])
            ->add('address', TextareaType::class, ['label' => $translator->trans('coordonnees.adresse'), 'required' => true])
            ->add('zip', TextType::class, ['label' => $translator->trans('coordonnees.code_postal'), 'required' => true, 'attr' => ['class' => 'basicAutoComplete']])
            ->add('town', TextType::class, ['label' => $translator->trans('coordonnees.ville'), 'required' => true])
            ->add('country_id', ChoiceType::class, ['label' => $translator->trans('coordonnees.pays'), 'required' => true, 'choices' => $tabCountries])
            ->add('phone', TextType::class, ['label' => $translator->trans('coordonnees.telephone_portable'), 'required' => true, 'attr' => array('id'=>'phone', 'placeholder' => '')])
            ->add('submit', SubmitType::class, ['label' => 'Valider'])
            ->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();

            $data = array_merge($session->get('utilisateur'), $data);
            $session->set('utilisateur', $data);

            if($_ENV["APP_ENV"] === 'dev'){
                return $this->redirectToRoute('app_compte_etape4_sepa');
            }
            return $this->redirectToRoute('app_compte_etape3_justificatif');
        }

        return $this->render('ouverture_compte/etape2_coordonnees.html.twig', [
            'surtitre' => $translator->trans(OuvertureCompteController::SURTITRE),
            'numero_etape' => 2,
            'nb_etapes' => OuvertureCompteController::NB_ETAPES,
            'titre' => $translator->trans('coordonnees.titre'),
            'form' => $form
        ]);
    }

    #[Route(path: '/{_locale}/ouverture-compte/justificatif', name: 'app_compte_etape3_justificatif')]
    public function etape3justificatif(SessionInterface $session, TranslatorInterface $translator): Response
    {
        $session->start();

        if($session->get('compteur') < 4){
            $form = $this->createFormBuilder()
                ->add('idcard', FileType::class, [
                    'label' => ' ',
                    'help' => 'Importez votre pièce d\'identité ',
                    'mapped' => false,
                    'required' => false,
                    'constraints' => [
                        new FileConstraint([
                            'maxSize' => '4024k',
                        ])
                    ],
                ])
                ->add('submit', SubmitType::class, ['label' => 'Valider'])
                ->getForm();

            return $this->render('ouverture_compte/etape3_justificatif.html.twig', [
                'surtitre' => $translator->trans(OuvertureCompteController::SURTITRE),
                'numero_etape' => 3,
                'nb_etapes' => OuvertureCompteController::NB_ETAPES,
                'titre' => $translator->trans('piece_d_identite.titre'),
                'form' => $form
            ]);
        } else {
            return $this->render('ouverture_compte/etape3_erreur.html.twig', [
                'surtitre' => $translator->trans(OuvertureCompteController::SURTITRE),
                'numero_etape' => 3,
                'nb_etapes' => OuvertureCompteController::NB_ETAPES,
                'titre' => $translator->trans('piece_d_identite_echec.titre')
            ]);
        }
    }

    #[Route(path: '/{_locale}/ouverture-compte/sepa', name: 'app_compte_etape4_sepa')]
    public function etape4Sepa(SessionInterface $session, TranslatorInterface $translator, Request $request, VacancesEuskoController $vacancesEuskoController) {
        $session->start();

        $form = $this->createFormBuilder(['autre_montant' => 20], ['attr' => ['id' => 'form-virement']])
            ->add('automatic_change_amount', ChoiceType::class,
                [
                    'required' => true,
                    'label' => $translator->trans('sepa.montant'),
                    'multiple' => false,
                    'expanded' => true,
                    'choices' => [
                        '100 eusko' => '100',
                        '60 eusko' => '60',
                        '20 eusko' => '20',
                        $translator->trans('ouverture_compte.change.autre_montant') => 'autre',
                    ],
                ]
            )
            ->add('autre_montant', NumberType::class,
                [
                    'required' => true,
                    'label' => $translator->trans("Montant"),
                    'constraints' => [
                        new NotBlank(),
                        new GreaterThanOrEqual(['value' => 20]),
                    ],
                ]
            )
            ->add('iban', TextType::class, [
                'required' => true,
                'label' => $translator->trans('sepa.iban'),
                'constraints' => [
                    new NotBlank(),
                ]])

            ->add('submit', SubmitType::class, ['label' => $translator->trans("Valider")])
            ->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {

            $data = $form->getData();
            $iban = str_replace(' ', '', $data['iban']);
            if ($vacancesEuskoController->isValidIBAN($iban)) {
                $data = array_merge($session->get('utilisateur'), $data);
                if($data['automatic_change_amount'] == 'autre'){
                    $data['automatic_change_amount'] = $data['autre_montant'];
                    unset($data['autre_montant']);
                }
                $session->set('utilisateur', $data);

                if($_ENV["APP_ENV"] == 'dev'){
                    //return $this->redirectToRoute('app_compte_etape6_cotisation');
                }
                return $this->redirectToRoute('ouverture_compte_signature_sepa');

            } else {
                $this->addFlash('warning', $translator->trans('sepa.iban_invalide'));
            }
        }

        return $this->render('ouverture_compte/etape4_sepaIban.html.twig', [
            'surtitre' => $translator->trans(OuvertureCompteController::SURTITRE),
            'numero_etape' => 4,
            'nb_etapes' => OuvertureCompteController::NB_ETAPES,
            'titre' => $translator->trans('change_automatique.titre'),
            'form' => $form
        ]);
    }

    #[Route(path: '/{_locale}/ouverture-compte/signature/sepa', name: 'ouverture_compte_signature_sepa')]
    public function signatureSepa(SessionInterface $session, EntityManagerInterface $em, Pdf $pdf, TranslatorInterface $translator, YouSignAPI $youSignAPI ): Response
    {
        $session->start();
        $user = $session->get('utilisateur');

        //etape 1 création de la signature request
        $responseCreateSignature = $youSignAPI->createSignatureRequest(name: "Signature prélèvement SEPA");

        //etape 2 ajout du fichier à signer
        $filePath = '/tmp/sepa-'.uniqid('', true).'.pdf';
        $pdf->generateFromHtml($this->renderView('ouverture_compte/modeleSepa.html.twig', ['user' => $user]), $filePath );
        $responseUploadDocument = $youSignAPI->addDocumentToSignatureRequest(signatureRequestId: $responseCreateSignature->id, filePath: $filePath, fileName: 'sepa.pdf');

        //etape 3 ajout signataire
        $responseAddSigner = $youSignAPI->addSignerToSignatureRequest(
            signatureRequestId: $responseCreateSignature->id,
            documentId: $responseUploadDocument->id,
            firstName: $user['firstname'],
            lastName: $user['lastname'],
            email: $user['email'],
            phoneNumber: $user['phone']);

        //etape 4 lancement de la procedure
        $responseActivateSignature = $youSignAPI->activateSignatureRequest(signatureRequestId: $responseCreateSignature->id);

        return $this->render('ouverture_compte/etape5_signature_sepa.html.twig', [
            'surtitre' => $translator->trans(OuvertureCompteController::SURTITRE),
            'numero_etape' => 5,
            'nb_etapes' => OuvertureCompteController::NB_ETAPES,
            'titre' => $translator->trans('signature_sepa_change_automatique.titre'),
            'signatureLink' => $responseActivateSignature->signers[0]->signature_link,
            'signatureRequestId' => $responseCreateSignature->id,
            'documentId' => $responseUploadDocument->id,
        ]);

    }

    #[Route(path: '/ouverture-compte/signature/sepa/download/{signatureRequestId}/{documentId}', name: 'ajax_yousign_download_doc')]
    public function yousignDownloadDoc(string $signatureRequestId, string $documentId, YouSignAPI $youSignAPI, SessionInterface $session)
    {
        //Récupérer le document signé par l'utilisateur
        $document = $youSignAPI->downloadDocumentRequest($signatureRequestId, $documentId);

        //Enregistrer le document en session
        $data = array_merge($session->get('utilisateur'), ['sepa_document' => base64_encode($document)]);
        $session->set('utilisateur', $data);

        return new JsonResponse('ok');
    }

    #[Route(path: '/{_locale}/ouverture-compte/cotisation', name: 'app_compte_etape6_cotisation')]
    public function etape6Cotisation(EntityManagerInterface $em, Request $request, SessionInterface $session, TranslatorInterface $translator)
    {
        $session->start();

        if($_ENV["APP_ENV"] == 'dev'){
            $docBase64 = 'data:image/jpeg;base64,HDZUDHuzdhZdhozqhdoizqh';

            $data = array_merge(
                $session->get('utilisateur'),
                ['id_document' => $docBase64, 'idcheck_report' => $docBase64, 'civility_id'=>'MR', 'birth'=>'2019-10-10']
            );
            $session->set('utilisateur', $data);
        }

        //on continue avec la cotisation
        $form = $this->createFormBuilder(null, ['attr' => ['id' => 'cotisation']])
            ->add('subscription_amount', ChoiceType::class, [
                'label' => $translator->trans('cotisation.montant'),
                'attr' => ['class' => 'chk'],
                'required' => true,
                'multiple' => false,
                'expanded' => true,
                'choices' => [
                    $translator->trans('cotisation.montant_par_mois_par_an', ['par_mois' => '2', 'par_an' => '24', 'monnaie' => 'eusko']) => '24',
                    $translator->trans('cotisation.montant_par_mois_par_an', ['par_mois' => '3', 'par_an' => '36', 'monnaie' => 'eusko']) => '36',
                    $translator->trans('cotisation.montant_par_mois_par_an', ['par_mois' => '5', 'par_an' => '60', 'monnaie' => 'eusko']) => '60',
                    $translator->trans('cotisation.montant_par_an', ['par_an' => '5', 'monnaie' => 'eusko']).$translator->trans('cotisation.cas_de_figure_cotisation_sociale') => '5'
                ],
            ])
            ->add('subscription_periodicity', ChoiceType::class, [
                'label' => $translator->trans('cotisation.periodicite'),
                'required' => true,
                'multiple' => false,
                'expanded' => true,
                'choices' => [
                    $translator->trans('cotisation.periodicite.annuel') => '12',
                    $translator->trans('cotisation.periodicite.mensuel') => '1',
                ],
            ])
            ->add('submit', SubmitType::class, ['label' => 'Valider'])
            ->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();
            // si l'utilisateur choisit le prélèvement mensuel, il faut diviser le montant de la cotisation par 12
            if ($data['subscription_periodicity'] == 1) {
                $data['subscription_amount'] = $data['subscription_amount'] / 12;
            }
            $data = array_merge($session->get('utilisateur'), $data);
            $session->set('utilisateur', $data);

            return $this->redirectToRoute('app_compte_etape7_securite');
        }

        return $this->render('ouverture_compte/etape6_cotisation.html.twig', [
            'surtitre' => $translator->trans(OuvertureCompteController::SURTITRE),
            'numero_etape' => 6,
            'nb_etapes' => OuvertureCompteController::NB_ETAPES,
            'titre' => $translator->trans('cotisation.titre'),
            'form' => $form
        ]);
    }

    #[Route(path: '/{_locale}/ouverture-compte/securite', name: 'app_compte_etape7_securite')]
    public function etape7Securite(APIToolbox $APIToolbox,
                                   Request $request,
                                   SessionInterface $session,
                                   TranslatorInterface $translator)
    {
        $session->start();

        $questions = ['' => ''];
        $response = $APIToolbox->curlWithoutToken('GET', '/predefined-security-questions/?language='.$request->getLocale());
        if($response['httpcode'] == 200){

            foreach ($response['data'] as $question){
                $questions[$question->question]=$question->question;
            }
            $questions[$translator->trans('Question personnalisée')] = 'autre';
        }

        $form = $this->createFormBuilder()
            ->add('password', RepeatedType::class, [
                'first_options'  => ['label' => $translator->trans('Mot de passe')],
                'second_options' => ['label' => $translator->trans('Confirmer le mot de passe')],
                'constraints' => [
                    new NotBlank(),
                    new Length(['min' => 4, 'max'=> 12]),
                ],
                'type' => PasswordType::class,
                'options' => ['attr' => ['class' => 'password-field']],
                'required' => true,
            ])
            ->add('pin_code', RepeatedType::class, [
                'first_options'  => ['label' => 'Code PIN (4 chiffres)'],
                'second_options' => ['label' => 'Confirmer le code'],
                'constraints' => [
                    new NotBlank(),
                    new Assert\Positive(),
                    new Length(['min' => 4, 'max'=> 4]),
                ],
                'type' => PasswordType::class,
                'options' => ['attr' => ['class' => 'password-field']],
                'required' => true,
            ])
            ->add('questionSecrete', ChoiceType::class, [
                'label' => $translator->trans('Question secrète'),
                'required' => true,
                'choices' => $questions
            ])
            ->add('questionPerso', TextType::class, ['label' => $translator->trans('Votre question personnalisée'), 'required' => false])
            ->add('answer', TextType::class, [
                'label' => $translator->trans('Réponse'),
                'required' => true,
                'constraints' => [
                    new NotBlank()
                ]
            ])
            ->add('submit', SubmitType::class, ['label' => 'Valider'])
            ->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();
            if($data['questionSecrete'] == 'autre'){
                $data['question'] = $data['questionPerso'];
            } else {
                $data['question'] = $data['questionSecrete'];
            }
            $data = array_merge($session->get('utilisateur'), $data);
            $session->set('utilisateur', $data);

            return $this->redirectToRoute('app_compte_etape8_choix_asso');
        }

        return $this->render('ouverture_compte/etape7_securite.html.twig', [
            'surtitre' => $translator->trans(OuvertureCompteController::SURTITRE),
            'numero_etape' => 7,
            'nb_etapes' => OuvertureCompteController::NB_ETAPES,
            'titre' => $translator->trans('securite.titre'),
            'form' => $form
        ]);
    }

    #[Route(path: '/{_locale}/ouverture-compte/choix-asso', name: 'app_compte_etape8_choix_asso')]
    public function etape8ChoixAsso(APIToolbox $APIToolbox,
                                    Request $request,
                                    SessionInterface $session,
                                    TranslatorInterface $translator,
                                    Security $security)
    {
        $session->start();

        $tabAssos = [];
        $response = $APIToolbox->curlWithoutToken('GET', '/associations/');
        if($response['httpcode'] == 200) {
            foreach ($response['data'] as $asso){
                $tabAssos[$asso->nom] = $asso->id;
            }
        }

        $form = $this->createFormBuilder()
            ->add('asso_id', ChoiceType::class,
                [
                    'required' => false,
                    'label' => $translator->trans('choix_asso.choisissez_une_asso'),
                    'multiple' => false,
                    'expanded' => false,
                    'choices' => $tabAssos,
                ])
            ->add('asso_saisie_libre', TextType::class,
                [
                    'required' => false,
                    'label' => $translator->trans('choix_asso.saisie_libre'),
                ])
            ->add('submit', SubmitType::class, ['label' => 'Valider'])
            ->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();
            $data = array_merge($session->get('utilisateur'), $data);
            $session->set('utilisateur', $data);

            $response = $APIToolbox->curlWithoutToken('POST', '/creer-compte/', $data);

            if($response['httpcode'] == 201) {
                $credentials['username'] = $response['data']->login;
                $credentials['password'] = $data['password'];

                $user = $APIToolbox->autoLogin($credentials);

                $session->set('_security.main.target_path', $this->generateUrl('app_compte_ecran_de_fin'));

                return $security->login($user, LoginFormAuthenticator::class);
            } else {
                $this->addFlash('danger', 'Erreur lors de la validation de vos données, merci de re-essayer ou de contacter un administrateur.');
            }
        }

        return $this->render('ouverture_compte/etape8_choix_asso.html.twig', [
            'surtitre' => $translator->trans(OuvertureCompteController::SURTITRE),
            'numero_etape' => 8,
            'nb_etapes' => OuvertureCompteController::NB_ETAPES,
            'titre' => $translator->trans('choix_asso.titre'),
            'form' => $form
        ]);
    }

    #[Route(path: '/{_locale}/ouverture-compte/bienvenue', name: 'app_compte_ecran_de_fin')]
    public function fin(): Response
    {
        return $this->render('ouverture_compte/fin.html.twig');
    }

}
