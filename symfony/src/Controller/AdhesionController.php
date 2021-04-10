<?php

namespace App\Controller;

use App\Entity\WebHookEvent;
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
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Contracts\Translation\TranslatorInterface;
use WiziYousignClient\WiziSignClient;

class AdhesionController extends AbstractController
{
    const SURTITRE = "Adhésion à l'Eusko";
    const NB_ETAPES = 5;

    /**
     * @Route("/{_locale}/adhesion", name="app_adhesion_etape1_identite")
     */
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

            $session->set('utilisateur', $data);

            return $this->redirectToRoute('app_adhesion_etape2_coordonnees');
        }

        return $this->render('adhesion/etape1_identite.html.twig', [
            'surtitre' => $translator->trans($this::SURTITRE),
            'numero_etape' => 1,
            'nb_etapes' => $this::NB_ETAPES,
            'titre' => $translator->trans('identite.titre'),
            'explication' => $translator->trans('adhesion.identite.explication'),
            'form' => $form->createView()
        ]);
    }

    /**
     * @Route("/{_locale}/adhesion/coordonnees", name="app_adhesion_etape2_coordonnees")
     */
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
            'form' => $form->createView()
        ]);
    }

    /**
     * @Route("/{_locale}/adhesion/cotisation", name="app_adhesion_etape3_cotisation")
     */
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
            'form' => $form->createView()
        ]);
    }

    /**
     * @Route("/{_locale}/adhesion/signature-sepa", name="app_adhesion_signature_sepa")
     */
    public function signatureSepa(SessionInterface $session, EntityManagerInterface $em, Pdf $pdf, TranslatorInterface $translator)
    {
        $session->start();
        $user = $session->get('utilisateur');

        //on démarre le client YouSign
        $youSignClient = new WiziSignClient($_ENV['YOUSIGN_API_KEY'], $_ENV['YOUSIGN_MODE']);

        //Création d'un identifiant unique qui permet de récupérer le webHook yousign dans la vue
        $identifiantWebHook = time();

        //Création du webHook
        $webHook = new WebHookEvent();
        $webHook->setIdentifiant($identifiantWebHook);

        //etape 1 init
        //pour tester, besoin d'un ngrok, remplacer generateURL
        $responseProcedure = $youSignClient->AdvancedProcedureCreate(
            [
                'start'=> false,
                'name' => 'Signature prélèvement SEPA',
                'description'=> 'SEPA'
            ],
            true,
            'GET',
            //'http://af5dff98a2aa.ngrok.io/eusko/cel/symfony/public/index.php/webhook',
            $this->generateUrl('ouverture_web_hook', [], UrlGeneratorInterface::ABSOLUTE_URL),
            $identifiantWebHook
        );

        //etape 2 fichier à signer
        $pdf->generateFromHtml($this->renderView('ouverture_compte/modeleSepa.html.twig', ['user' => $user]), '/tmp/sepa-'.$identifiantWebHook.'.pdf' );
        $responseFile = $youSignClient->AdvancedProcedureAddFile('/tmp/sepa-'.$identifiantWebHook.'.pdf', 'sepa.pdf');

        //etape 3 ajout signataire
        $response = $youSignClient->AdvancedProcedureAddMember($user['firstname'],$user['lastname'],$user['email'], $user['phone']);
        $member = json_decode($response);

        //etape 4 position et contenu de la signature
        $response = $youSignClient->AdvancedProcedureFileObject("150,235,460,335",1,"Lu et approuvé", "Signé par ".$user['firstname']." ".$user['lastname'], "Signé par ".$user['firstname']." ".$user['lastname']);

        //etape 5 lancement de la procédure
        $response = $youSignClient->AdvancedProcedurePut();
        $status = json_decode($response)->status;
        if($status == 'active'){
            //on enregistre l'id du fichier pour le récuperer signé plus tard
            $webHook->setFile(json_decode($responseFile)->id);
            $em->persist($webHook);
            $em->flush();

            //On sauvegarde en session l'ID du webHook
            $session->set('idWebHookEvent', $webHook->getId());
        } else {
            $this->addFlash('warning', 'Erreur lors de la création de la signature électronique');
            $identifiantWebHook = 0;
        }

        return $this->render('adhesion/etape4_signature_sepa.html.twig', [
            'surtitre' => $translator->trans($this::SURTITRE),
            'numero_etape' => 4,
            'nb_etapes' => $this::NB_ETAPES,
            'titre' => $translator->trans('signature_sepa.adhesion.titre'),
            'memberToken' => $member->id,
            'webHook' => $identifiantWebHook
        ]);
    }

    /**
     * @Route("/{_locale}/adhesion/choix-asso", name="app_adhesion_etape5_choix_asso")
     */
    public function etape5ChoixAsso(EntityManagerInterface $em,
                                    APIToolbox $APIToolbox,
                                    Request $request,
                                    SessionInterface $session,
                                    TranslatorInterface $translator)
    {
        $session->start();

        //récupérer le SEPA signé et le stocker en session
        $webHook = $em->getRepository("App:WebHookEvent")->find($session->get('idWebHookEvent'));
        $youSignClient = new WiziSignClient($_ENV['YOUSIGN_API_KEY'], $_ENV['YOUSIGN_MODE']);
        $file = $youSignClient->downloadSignedFile($webHook->getFile(), 'base64');
        $data = array_merge($session->get('utilisateur'), ['sepa_document' => $file]);
        $session->set('utilisateur', $data);

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
            'form' => $form->createView()
        ]);
    }

    /**
     * @Route("/{_locale}/adhesion/fin", name="app_adhesion_fin")
     */
    public function fin()
    {
        return $this->render('adhesion/fin.html.twig');
    }
}
