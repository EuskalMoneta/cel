<?php

namespace App\Controller;

use App\Entity\WebHookEvent;
use App\Security\LoginFormAuthenticator;
use Doctrine\ORM\EntityManagerInterface;
use JsonSchema\Constraints\NumberConstraint;
use Knp\Snappy\Pdf;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
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
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\Authentication\AuthenticationManagerInterface;
use Symfony\Component\Security\Guard\GuardAuthenticatorHandler;
use Symfony\Component\Validator\Constraints\File as FileConstraint;
use Symfony\Component\Validator\Constraints\GreaterThanOrEqual;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Contracts\Translation\TranslatorInterface;
use WiziYousignClient\WiziSignClient;
use Symfony\Component\Validator\Constraints as Assert;

class OuvertureCompteController extends AbstractController
{

    /**
     * @Route("/webhook", name="ouverture_web_hook")
     */
    public function webHook(EntityManagerInterface $em, Request $request)
    {
        //On récupère les headers de yousign pour associer le webhook à la bonne procédure
        $identifiantHook = $request->headers->get('x-custom-header');
        $evtName = $request->headers->get('x-yousign-event-name');

        $webHook = $em->getRepository('App:WebHookEvent')->findOneBy(['identifiant'=> $identifiantHook]);

        //si c'est l'evt de fin on change le statut du webHook interne
        if($evtName == 'member.finished'){
            $webHook->setStatut('finished');
        } else {
            $webHook->setStatut('started');
        }

        //enregistrement
        $em->persist($webHook);
        $em->flush();

        return new Response();
    }

    /**
     * @Route("/webhook/ajax", name="ajax_yousign_webhook")
     */
    public function ajaxResponse(EntityManagerInterface $em, Request $request)
    {
        //Toutes les 5 secondes on vérifie si le webhook a changé de statut, si oui on envoi le signal ok
        $webHook = $em->getRepository('App:WebHookEvent')->findOneBy(['identifiant'=> $request->get('name')]);

        if($webHook->getStatut() =='finished'){
            return new JsonResponse('ok');
        } else {
            return new JsonResponse('en attente');
        }
    }

    /**
     * @Route("/ouverture-compte/signature/sepa", name="ouverture_compte_signature_sepa")
     */
    public function signatureSepa(SessionInterface $session, EntityManagerInterface $em, Pdf $pdf)
    {
        $session->start();
        $user = $session->get('utilisateur');

        //on démarre le client YouSign
        $youSignClient = new WiziSignClient($_ENV['YOUSIGN_API_KEY'], $_ENV['YOUSIGN_API_KEY']);

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
            $this->generateUrl('ouverture_web_hook'),
            $identifiantWebHook
        );

        //etape 2 fichier à signer
        $pdf->generateFromHtml($this->renderView('ouverture_compte/modeleSepa.html.twig', ['user' => $user]), '/tmp/sepa-'.$identifiantWebHook.'.pdf' );
        $responseFile = $youSignClient->AdvancedProcedureAddFile('/tmp/sepa-'.$identifiantWebHook.'.pdf', 'sepa.pdf');

        //etape 3 ajout signataire
        $response = $youSignClient->AdvancedProcedureAddMember($user['firstname'],$user['lastname'],$user['email'], $user['phone']);
        $member = json_decode($response);

        //etape 4 position et contenu de la signature
        $response = $youSignClient->AdvancedProcedureFileObject("33,235,291,338",1,"Lu et approuvé", "Signé par ".$user['firstname']." ".$user['lastname'], "Signé par ".$user['firstname']." ".$user['lastname']);

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


        return $this->render('ouverture_compte/etape4_signature_sepa.html.twig', [
            'memberToken' => $member->id,
            'webHook' => $identifiantWebHook
        ]);
    }

    /**
     * @Route("/ouverture-compte", name="app_ouverture_etape1_identite")
     */
    public function etape1Identite(Request $request, TranslatorInterface $translator, SessionInterface $session)
    {
        $session->start();
        $session->set('utilisateur', []);

        $form = $this->createFormBuilder()
            ->add('lastname', TextType::class, ['label' => 'Nom', 'required' => true, 'constraints' => [ new NotBlank(),]])
            ->add('firstname', TextType::class, ['label' => 'Prénom', 'required' => true, 'constraints' => [ new NotBlank(),]])
            ->add('email', EmailType::class, ['label' => 'Email', 'required' => true, 'constraints' => [ new NotBlank() ] ])
            ->add('valide', CheckboxType::class, ['label' => " ", 'required' => true])
            ->add('submit', SubmitType::class, ['label' => 'Valider'])
            ->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();

            $session->set('utilisateur', $data);
            $session->set('compteur', 1);

            return $this->redirectToRoute('app_compte_etape2_coordonnees');

        }
        return $this->render('ouverture_compte/etape_identite.html.twig', ['title' => $translator->trans("Identité"), 'form' => $form->createView()]);
    }

    /**
     * @Route("/ouverture-compte/coordonnees", name="app_compte_etape2_coordonnees")
     */
    public function etape2Coordonnees(APIToolbox $APIToolbox, Request $request, SessionInterface $session, TranslatorInterface $translator)
    {

        $session->start();

        $responseCountries = $APIToolbox->curlWithoutToken('GET', '/countries/');
        $tabCountries = [];

        foreach ($responseCountries['data'] as $country){
            if($country->label == '-'){
                $tabCountries[$country->label] = '';
            } else {
                $tabCountries[$country->label] = $country->id;
            }
        }

        $form = $this->createFormBuilder()
            ->add('address', TextareaType::class, ['required' => true])
            ->add('zip', TextType::class, ['required' => true, 'attr' => ['class' => 'basicAutoComplete']])
            ->add('town', TextType::class, ['required' => true])
            ->add('country_id', ChoiceType::class, ['required' => true, 'choices' => $tabCountries])
            ->add('phone', TextType::class, ['required' => true, 'attr' => array('id'=>'phone', 'placeholder' => '+33'), 'help' => $translator->trans("Tapez +33 puis votre numéro de portable sans le 0. Exemple : +33 6 01 02 03 04. Pour d’autres pays, mettre l’indicatif international de ce pays.")])
            ->add('submit', SubmitType::class, ['label' => 'Valider'])
            ->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();

            $data = array_merge($session->get('utilisateur'), $data);
            $session->set('utilisateur', $data);

            return $this->redirectToRoute('app_compte_etape3_justificatif');
        }
        return $this->render('ouverture_compte/etape2_coordonnees.html.twig', ['title' => "Coordonnées", 'form' => $form->createView()]);
    }

    /**
     * @Route("/ouverture-compte/justificatif", name="app_compte_etape3_justificatif")
     */
    public function etape3justificatif(SessionInterface $session, TranslatorInterface $translator)
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

            return $this->render('ouverture_compte/etape3_justificatif.html.twig', ['title' => $translator->trans("Pièce d'identité"), 'form' => $form->createView()]);
        }
        return $this->render('ouverture_compte/etape3_erreur.html.twig');
    }

    /**
     * @Route("/ouverture-compte/sepa", name="app_compte_etape4_sepa")
     */
    public function etape4Sepa(SessionInterface $session, TranslatorInterface $translator, Request $request, VacancesEuskoController $vacancesEuskoController) {
        $session->start();

        $form = $this->createFormBuilder(null, ['attr' => ['id' => 'form-virement']])
            ->add('automatic_change_amount', NumberType::class,
                [
                    'required' => true,
                    'label' => $translator->trans($translator->trans("Montant du change automatique mensuel (minimum 20 eusko)")),
                    'constraints' => [
                        new NotBlank(),
                        new GreaterThanOrEqual(['value' => 20]),
                    ],
                ]
            )
            ->add('iban', TextType::class, [
                'required' => true,
                'label' => $translator->trans("Coordonnées du compte à prélever (IBAN)"),
                'help' => $translator->trans("Après avoir cliqué sur Valider, vous serez orientés vers la plateforme sécurisée Yousign pour signer l’autorisation de prélèvement."),
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
                $session->set('utilisateur', $data);

                return $this->redirectToRoute('ouverture_compte_signature_sepa');
            } else {
                $this->addFlash('warning', $translator->trans("Votre IBAN n'est pas valide"));
            }
        }

        return $this->render('ouverture_compte/etape4_sepaIban.html.twig', ['title' => $translator->trans('Change automatique mensuel'), 'form' => $form->createView()]);

    }


    /**
     * @Route("/ouverture-compte/securite", name="app_compte_etape5_securite")
     */
    public function etape5Securite(APIToolbox $APIToolbox,
                                   EntityManagerInterface $em,
                                   Request $request,
                                   TranslatorInterface $translator,
                                   SessionInterface $session,
                                   LoginFormAuthenticator $loginFormAuthenticator,
                                   GuardAuthenticatorHandler $guardAuthenticatorHandler,
                                   AuthenticationManagerInterface $authenticationManager)
    {
        $session->start();

        //récupérer le SEPA signé et le stocker en session
        $webHook = $em->getRepository("App:WebHookEvent")->find($session->get('idWebHookEvent'));

        $youSignClient = new WiziSignClient($_ENV['YOUSIGN_API_KEY'], $_ENV['YOUSIGN_API_KEY']);
        $file = $youSignClient->downloadSignedFile($webHook->getFile(), 'base64');

        $data = array_merge($session->get('utilisateur'), ['sepa_document' => $file]);
        $session->set('utilisateur', $data);


        //on continue avec le mot de passe et la question secrète
        $questions = ['' => ''];
        $response = $APIToolbox->curlWithoutToken('GET', '/predefined-security-questions/?language='.$request->getLocale());

        if($response['httpcode'] == 200){

            foreach ($response['data'] as $question){
                $questions[$question->question]=$question->question;
            }
            $questions['Question personalisée'] = 'autre';

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
                ->add('pin1', RepeatedType::class, [
                    'first_options'  => ['label' => 'Code pin (4 chiffres)'],
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
                    'label' => $translator->trans('Votre question secrète'),
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
                $data = array_merge($session->get('utilisateur'), $data);
                $session->set('utilisateur', $data);

                if($data['questionSecrete'] == 'autre'){
                    $data['question'] = $data['questionPerso'];
                } else {
                    $data['question'] = $data['questionSecrete'];
                }

                $response = $APIToolbox->curlWithoutToken('POST', '/creer-compte/', $data);

                if($response['httpcode'] == 201){
                    $credentials['username'] = $response['data']->login;
                    $credentials['password'] = $data['password'];

                    $user = $APIToolbox->autoLogin($credentials);

                    //Route pour la redirection après login
                    $session->set('_security.main.target_path', $this->generateUrl('app_compte_etape5_sucess'));

                    return $guardAuthenticatorHandler
                        ->authenticateUserAndHandleSuccess(
                            $user,
                            $request,
                            $loginFormAuthenticator,
                            'main'
                        );
                } else {
                    $this->addFlash('danger', 'Erreur lors de la validation de vos données, merci de re-essayer ou de contacter un administrateur.');
                }


            }
        }
        return $this->render('ouverture_compte/etape5_securite.html.twig', ['form' => $form->createView()]);

    }

    /**
     * @Route("/ouverture-compte/bienvenue", name="app_compte_etape5_sucess")
     */
    public function etape5Success(APIToolbox $APIToolbox, Request $request)
    {
        return $this->render('ouverture_compte/etape5_success.html.twig', ['title' => "Bienvenue"]);
    }

}
