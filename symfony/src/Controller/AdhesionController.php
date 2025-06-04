<?php

namespace App\Controller;

use App\Service\YouSignAPI;
use Doctrine\ORM\EntityManagerInterface;
use Knp\Snappy\Pdf;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Contracts\Translation\TranslatorInterface;


class AdhesionController extends AbstractController
{
    const SURTITRE = "Adhésion à l'Eusko";
    const NB_ETAPES = 5;

    /**
     * A partir d'un numéro d'adhérent, permet de passer à l'étape 2
     * d'une nouvelle adhésion ou ouverture de compte
     * Fonction passerelle entre la recherche et les processus d'inscription
     * @param string $type adhesion | compte
     * @param string $login le numéro d'adhérent de type E00001
     */
    #[Route(path: '/{_locale}/poursuiteInscription/{type}/{login}', name: 'app_adhesion_etape0_passerelle')]
    public function poursuiteInscription($type, TranslatorInterface $translator, SessionInterface $session, APIToolbox $APIToolbox, $login=""): \Symfony\Component\HttpFoundation\RedirectResponse
    {
        //Récupération du membre
        $response = $APIToolbox->curlWithoutToken('GET', '/members/?token=toto&login='.$login, '');
        if ($response['httpcode'] == 200) {
            $member = $response['data'][0];
            if($member){
                if($type == 'adhesion'){
                    $data['login'] = $login;
                    $data['civility_id'] = $member->civility_id;
                    $data['lastname'] = $member->lastname;
                    $data['firstname'] =  $member->firstname;
                    $data['email'] =  $member->email;
                    $data['birth'] =  $member->birth;
                    $session->set('utilisateur', $data);

                    return $this->redirectToRoute('app_adhesion_etape2_coordonnees');

                } elseif ($type == 'compte'){
                    $data['login'] = $login;
                    $data['lastname'] = $member->lastname;
                    $data['firstname'] =  $member->firstname;
                    $data['email'] =  $member->email;
                    $data['valide'] =  true;
                    $session->set('utilisateur', $data);
                    $session->set('compteur', 1);

                    return $this->redirectToRoute('app_compte_etape2_coordonnees');
                } elseif ($type == 'prelevement'){

                    return $this->redirectToRoute('app_signature_mandat_cotisation_etape1_coordonnees', ['token' => $member->array_options->options_token]);
                }
            }
        } elseif($login == '') {
            if ($type == 'adhesion') {
                return $this->redirectToRoute('app_adhesion_etape1_identite');
            } elseif ($type == 'compte'){
                return $this->redirectToRoute('app_ouverture_etape_identite');
            }
        } else {
            $this->addFlash('warning', $translator->trans('numéro de compte en erreur'));
        }

        //si il n'y a pas eu de redirection, on redirige vers la page de recherche
        return $this->redirectToRoute('app_adhesion_etape0_recherche');
    }

    /**
     * Demande d'un mot de passe pour accéder à la recherche d'utilisateur
     * Stockage dans un cookie pour une durée déterminée
     */
    #[Route(path: '/{_locale}/adhesion-admin', name: 'app_adhesion_admin_password')]
    public function demandeMotDePasse(Request $request, TranslatorInterface $translator, SessionInterface $session, APIToolbox $APIToolbox)
    {
        $formBuilder = $this->createFormBuilder()
            ->add('motDePasse', TextType::class, [
                'label' => $translator->trans("Mot de passe"),
                'required' => false,
            ])
            ->add('submit', SubmitType::class, ['label' => 'Valider'])
        ;
        $form = $formBuilder->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();

            //On verifie le mot de passe et on défini en session une durée de validitée
            if ($data['motDePasse'] === 'TableINFO') {
                $session->set('motDePasseRechercheAdherent', strtotime('+5 hours'));
                return $this->redirectToRoute('app_adhesion_etape0_recherche');
            } else {
                $this->addFlash('warning', 'Mot de passe incorrect');
            }
        }

        return $this->render('adhesion/etape0_mot_de_passe.html.twig', [
            'surtitre' => $translator->trans('recherche_adherent.mot_de_passe'),
            'numero_etape' => 0,
            'nb_etapes' => $this::NB_ETAPES,
            'titre' => '',
            'explication' => '',
            'form' => $form
        ]);
    }

    /**
     * Formulaire de recherche multi critères d'un adhérent
     * renvoi une liste d'adhérents
     * Accès réservé par mot de passe
     */
    #[Route(path: '/{_locale}/adhesion-admin/recherche', name: 'app_adhesion_etape0_recherche')]
    public function etape0Recherche(Request $request, TranslatorInterface $translator, SessionInterface $session, APIToolbox $APIToolbox)
    {
        $adherents = "vide";

        //Création d'un formulaire de recherche, le mot de passe permet de restreindre l'accès aux données aux seul "administrateurs"
        $formBuilder = $this->createFormBuilder();
        $formBuilder
            ->add('term', TextType::class, [
                'label' => $translator->trans(' '),
                'required' => false,
            ])
            ->add('submit', SubmitType::class, ['label' => $translator->trans('rechercher')]);
        $form = $formBuilder->getForm();

        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();

            //Vérification qu'un mot de passe a été saisi
            if($session->has('motDePasseRechercheAdherent')){

                //verification de la durée du mot de passe
                if($session->get('motDePasseRechercheAdherent') < (new \DateTime("now"))->getTimestamp()){
                    return $this->redirectToRoute('app_adhesion_admin_password');
                }
                $adherents = [];

                //Recherche du membre via son nom dans dolibarr
                $responseLastname = $APIToolbox->curlWithoutToken('GET', '/members/?token=toto&name='.$data['term'], '');
                if ($responseLastname['httpcode'] == 200) {
                    $adherents = array_merge($adherents, $responseLastname['data']);
                }

                //Recherche du membre via son prenom dans dolibarr
                $responseFirstname = $APIToolbox->curlWithoutToken('GET', '/members/?token=toto&name=' . $data['term'], '');
                if ($responseFirstname['httpcode'] == 200) {
                    $adherents = array_merge($adherents, $responseFirstname['data']);
                }

                //Recherche du membre via son email dans dolibarr
                $responseEmail = $APIToolbox->curlWithoutToken('GET', '/members/?token=toto&email=' . $data['term'], '');
                if ($responseEmail['httpcode'] == 200) {
                    $adherents = array_merge($adherents, [$responseEmail['data']]);
                }

                //dédoublonner les résultats
                $adherents = array_unique($adherents, SORT_REGULAR);
            }
        }

        return $this->render('adhesion/etape0_recherche.html.twig', [
            'surtitre' => $translator->trans('recherche_adherent.titre'),
            'numero_etape' => 0,
            'nb_etapes' => $this::NB_ETAPES,
            'titre' => $translator->trans(' '),
            'explication' => '',
            'adherents' => $adherents,
            'form' => $form
        ]);

    }

    /**
     * Première étape du processus d'adhésion, demande nom, prenom
     */
    #[Route(path: '/{_locale}/adhesion', name: 'app_adhesion_etape1_identite')]
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
        if ($member) {
            $formBuilder->add('login', TextType::class, [
                'label' => $translator->trans("N° d'adhérent"),
                'required' => true,
                'attr' => [ 'readonly' => true ],
                'data' => $member->login,
            ]);
        }

        $formBuilder
            ->add('civility_id', ChoiceType::class, [
                'choices' => [
                    $translator->trans('identite.madame') => 'MME',
                    $translator->trans('identite.monsieur') => 'MR'
                ],
                'label' => $translator->trans('identite.civilite'),
                'required' => true,
                'constraints' => [ new NotBlank() ],
                'data' => ($member == null) ? '' : $member->civility_id,
            ])
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
            ->add('birth', DateType::class, [
                'label' => $translator->trans('identite.date_naissance'),
                'required' => true,
                'constraints' => [ new NotBlank() ],
                'widget' => 'single_text',
                'input' => 'string',
            ])
            ->add('email', EmailType::class, [
                'label' => $translator->trans('identite.email'),
                'required' => true,
                'constraints' => [ new NotBlank() ],
                'data' => ($member == null) ? '' : $member->email,
            ])
            ->add('submit', SubmitType::class, ['label' => 'Valider']);
        $form = $formBuilder->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();

            if (!$member) {
                //Vérifier l'existance d'un compte adhérent dans dolibarr, si l'utilisateur existe un email est envoyé contenant
                //le jeton d'authentification
                $response = $APIToolbox->curlWithoutToken(
                    'POST',
                    '/verifier-existence-compte/',
                    ['email' => $data["email"], 'type' => 'adhesion', "language" => $request->getLocale()]
                );
                if ($response['httpcode'] == 200) {
                    return $this->render('ouverture_compte/attente_reception_email.html.twig', [
                        'surtitre' => $translator->trans($this::SURTITRE),
                        'numero_etape' => 1,
                        'nb_etapes' => $this::NB_ETAPES,
                        'titre' => $translator->trans('attente_reception.titre'),
                        'explication' => $translator->trans('attente_reception.explication')
                    ]);
                }
            }

            $session->set('utilisateur', $data);

            return $this->redirectToRoute('app_adhesion_etape2_coordonnees');
        }

        return $this->render('adhesion/etape1_identite.html.twig', [
            'surtitre' => $translator->trans($this::SURTITRE),
            'numero_etape' => 1,
            'nb_etapes' => $this::NB_ETAPES,
            'titre' => $translator->trans('identite.titre'),
            'explication' => $translator->trans('adhesion.identite.explication'),
            'form' => $form
        ]);
    }

    #[Route(path: '/{_locale}/adhesion/coordonnees', name: 'app_adhesion_etape2_coordonnees')]
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

            return $this->redirectToRoute('app_adhesion_etape3_cotisation');
        }

        return $this->render('ouverture_compte/etape2_coordonnees.html.twig', [
            'surtitre' => $translator->trans($this::SURTITRE),
            'numero_etape' => 2,
            'nb_etapes' => $this::NB_ETAPES,
            'titre' => $translator->trans('coordonnees.titre'),
            'form' => $form
        ]);
    }

    #[Route(path: '/{_locale}/adhesion/cotisation', name: 'app_adhesion_etape3_cotisation')]
    public function etape3Cotisation(Request $request, SessionInterface $session, TranslatorInterface $translator, VacancesEuskoController $vacancesEuskoController)
    {
        $session->start();

        $form = $this->createFormBuilder(null, ['attr' => ['id' => 'cotisation']])
            ->add('subscription_amount', ChoiceType::class, [
                'label' => $translator->trans('cotisation.montant'),
                'attr' => ['class' => 'chk'],
                'required' => true,
                'multiple' => false,
                'expanded' => true,
                'choices' => [
                    $translator->trans('cotisation.montant_par_mois_par_an', ['par_mois' => '2', 'par_an' => '24', 'monnaie' => '€']) => '24',
                    $translator->trans('cotisation.montant_par_mois_par_an', ['par_mois' => '3', 'par_an' => '36', 'monnaie' => '€']) => '36',
                    $translator->trans('cotisation.montant_par_mois_par_an', ['par_mois' => '5', 'par_an' => '60', 'monnaie' => '€']) => '60',
                    $translator->trans('cotisation.montant_par_an', ['par_an' => '5', 'monnaie' => '€']).$translator->trans('cotisation.cas_de_figure_cotisation_sociale') => '5'
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
            ->add('iban', TextType::class, [
                'required' => true,
                'label' => $translator->trans('sepa.iban'),
                'constraints' => [
                    new NotBlank(),
                ]
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

            $iban = str_replace(' ', '', $data['iban']);
            if ($vacancesEuskoController->isValidIBAN($iban)) {
                $data = array_merge($session->get('utilisateur'), $data);
                $session->set('utilisateur', $data);

                return $this->redirectToRoute('app_adhesion_signature_sepa');

            } else {
                $this->addFlash('warning', $translator->trans('sepa.iban_invalide'));
            }
        }

        return $this->render('adhesion/etape3_cotisation.html.twig', [
            'surtitre' => $translator->trans($this::SURTITRE),
            'numero_etape' => 3,
            'nb_etapes' => $this::NB_ETAPES,
            'titre' => $translator->trans('cotisation.titre'),
            'form' => $form
        ]);
    }

    #[Route(path: '/{_locale}/adhesion/signature-sepa', name: 'app_adhesion_signature_sepa')]
    public function signatureSepa(SessionInterface $session, EntityManagerInterface $em, Pdf $pdf, YouSignAPI $youSignAPI, TranslatorInterface $translator): \Symfony\Component\HttpFoundation\Response
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

        return $this->render('adhesion/etape4_signature_sepa.html.twig', [
            'surtitre' => $translator->trans($this::SURTITRE),
            'numero_etape' => 4,
            'nb_etapes' => $this::NB_ETAPES,
            'titre' => $translator->trans('signature_sepa.adhesion.titre'),
            'signatureLink' => $responseActivateSignature->signers[0]->signature_link,
            'signatureRequestId' => $responseCreateSignature->id,
            'documentId' => $responseUploadDocument->id,
        ]);
    }

    #[Route(path: '/{_locale}/adhesion/choix-asso', name: 'app_adhesion_etape5_choix_asso')]
    public function etape5ChoixAsso(EntityManagerInterface $em,
                                    APIToolbox $APIToolbox,
                                    Request $request,
                                    SessionInterface $session,
                                    TranslatorInterface $translator)
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

            $response = $APIToolbox->curlWithoutToken('POST', '/adherer/', $data);

            if($response['httpcode'] == 201) {
                $session->set('utilisateur', []);
                return $this->redirectToRoute('app_adhesion_fin');
            } else {
                $this->addFlash('danger', 'Erreur lors de la validation de vos données, merci de re-essayer ou de contacter un administrateur.');
            }
        }

        return $this->render('ouverture_compte/etape8_choix_asso.html.twig', [
            'surtitre' => $translator->trans($this::SURTITRE),
            'numero_etape' => 5,
            'nb_etapes' => $this::NB_ETAPES,
            'titre' => $translator->trans('choix_asso.titre'),
            'form' => $form
        ]);
    }

    #[Route(path: '/{_locale}/adhesion/fin', name: 'app_adhesion_fin')]
    public function fin(): \Symfony\Component\HttpFoundation\Response
    {
        return $this->render('adhesion/fin.html.twig');
    }
}
