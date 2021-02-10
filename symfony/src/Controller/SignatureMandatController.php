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

class SignatureMandatController extends AbstractController
{
    const SURTITRE = "Signature d'un mandat de prélèvement SEPA pour la cotisation";
    const NB_ETAPES = 2;

    /**
     * @Route("/{_locale}/signature-mandat-cotisation", name="app_signature_mandat_cotisation_etape1_coordonnees")
     */
    public function etape1Coordonnees(Request $request, SessionInterface $session, TranslatorInterface $translator, APIToolbox $APIToolbox, VacancesEuskoController $vacancesEuskoController)
    {
        $session->start();
        $session->set('utilisateur', []);

        // Le paramètre "token" est obligatoire et sert à charger le formulaire pour un adhérent existant.
        $member = null;
        $token = $request->query->get('token');
        $response = $APIToolbox->curlWithoutToken('GET', '/members/?token='.$token);
        if ($response['httpcode'] == 200) {
            $member = $response['data'][0];
        } else {
            $this->addFlash('danger', 'token_manquant_ou_invalide');
        }

        $responseCountries = $APIToolbox->curlWithoutToken('GET', '/countries/');
        $tabCountries = [];
        foreach ($responseCountries['data'] as $country){
            if($country->label != '-'){
                $tabCountries[$country->label] = $country->id;
            }
        }

        $formBuilder = $this->createFormBuilder();
        $formBuilder
            ->add('login', TextType::class, [
                'label' => $translator->trans("N° d'adhérent"),
                'required' => true,
                'attr' => [ 'readonly' => true ],
                'data' => $member ? $member->login : '',
            ]);
        if ($member and $member->login[0] == 'Z') {
            $formBuilder
                ->add('company', TextType::class, [
                    'label' => $translator->trans("Entreprise / Association"),
                    'required' => true,
                    'constraints' => [ new NotBlank() ],
                    'data' => $member->company,
                ]);
        }
        $formBuilder
            ->add('lastname', TextType::class, [
                'label' => $translator->trans('identite.nom'),
                'required' => true,
                'constraints' => [ new NotBlank() ],
                'data' => $member ? $member->lastname : '',
            ])
            ->add('firstname', TextType::class, [
                'label' => $translator->trans('identite.prenom'),
                'required' => true,
                'constraints' => [ new NotBlank() ],
                'data' => $member ? $member->firstname : '',
            ])
            ->add('address', TextareaType::class, [
                'label' => $translator->trans('coordonnees.adresse'),
                'required' => true,
                'data' => $member ? $member->address : '',
            ])
            ->add('zip', TextType::class, [
                'label' => $translator->trans('coordonnees.code_postal'),
                'required' => true,
                'attr' => ['class' => 'basicAutoComplete'],
                'data' => $member ? $member->zip : '',
            ])
            ->add('town', TextType::class, [
                'label' => $translator->trans('coordonnees.ville'),
                'required' => true,
                'data' => $member ? $member->town : '',
            ])
            ->add('country_id', ChoiceType::class, [
                'label' => $translator->trans('coordonnees.pays'),
                'required' => true,
                'choices' => $tabCountries,
                'data' => $member ? $member->country_id : '',
            ])
            ->add('phone', TextType::class, [
                'label' => $translator->trans('coordonnees.telephone_portable'),
                'required' => true,
                'attr' => array('id'=>'phone', 'placeholder' => ''),
            ])
            ->add('email', EmailType::class, [
                'label' => $translator->trans('identite.email'),
                'required' => true,
                'constraints' => [ new NotBlank() ],
                'data' => $member ? $member->email : '',
            ])
            ->add('iban', TextType::class, [
                'required' => true,
                'label' => $translator->trans('sepa.iban'),
                'constraints' => [
                    new NotBlank(),
                ]
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
            ->add('submit', SubmitType::class, ['label' => 'Valider']);
        $form = $formBuilder->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();

            $iban = str_replace(' ', '', $data['iban']);
            if ($vacancesEuskoController->isValidIBAN($iban)) {
                $data = array_merge($session->get('utilisateur'), $data);
                $session->set('utilisateur', $data);

                return $this->redirectToRoute('app_signature_mandat_cotisation_etape2_signature_sepa');
            } else {
                $this->addFlash('warning', $translator->trans('sepa.iban_invalide'));
            }
        }

        return $this->render('signature_mandat_cotisation/etape1_coordonnees.html.twig', [
            'surtitre' => $translator->trans($this::SURTITRE),
            'numero_etape' => 1,
            'nb_etapes' => $this::NB_ETAPES,
            'titre' => $translator->trans('mandat_sepa.titre'),
            'form' => $form->createView()
        ]);
    }

    /**
     * @Route("/{_locale}/signature-mandat-cotisation/signature-sepa", name="app_signature_mandat_cotisation_etape2_signature_sepa")
     */
    public function etape2SignatureSepa(SessionInterface $session, EntityManagerInterface $em, Pdf $pdf, TranslatorInterface $translator)
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

        return $this->render('signature_mandat_cotisation/etape2_signature_sepa.html.twig', [
            'surtitre' => $translator->trans($this::SURTITRE),
            'numero_etape' => 2,
            'nb_etapes' => $this::NB_ETAPES,
            'titre' => $translator->trans('signature_sepa.adhesion.titre'),
            'memberToken' => $member->id,
            'webHook' => $identifiantWebHook
        ]);
    }

    /**
     * @Route("/{_locale}/signature-mandat-cotisation/fin", name="app_signature_mandat_cotisation_fin")
     */
    public function fin()
    {
        $session->start();

        //récupérer le SEPA signé
        $webHook = $em->getRepository("App:WebHookEvent")->find($session->get('idWebHookEvent'));
        $youSignClient = new WiziSignClient($_ENV['YOUSIGN_API_KEY'], $_ENV['YOUSIGN_MODE']);
        $file = $youSignClient->downloadSignedFile($webHook->getFile(), 'base64');

        $data = array_merge($session->get('utilisateur'), ['sepa_document' => $file]);

        $response = $APIToolbox->curlWithoutToken('POST', '/enregistrer-mandat-cotisation/', $data);

        if ($response['httpcode'] == 200) {
            return $this->render('signature_mandat_cotisation/fin.html.twig');
        } else {
            $this->addFlash('danger', 'Erreur lors de la validation de vos données, merci de re-essayer ou de contacter un administrateur.');
        }
    }
}
