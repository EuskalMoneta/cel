<?php

namespace App\Controller;

use App\Security\LoginFormAuthenticator;
use App\Security\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\RepeatedType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\IsGranted;
use Symfony\Component\Security\Core\Authentication\AuthenticationManagerInterface;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use Symfony\Component\Security\Guard\GuardAuthenticatorHandler;
use Symfony\Component\Validator\Constraints\File as FileConstraint;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Contracts\Translation\TranslatorInterface;


class VacancesEuskoController extends AbstractController
{

    /**
     * @Route("/vacances-en-eusko", name="app_vee_etape1_identite")
     */
    public function etape1Identite(APIToolbox $APIToolbox, Request $request, TranslatorInterface $translator, SessionInterface $session)
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

            return $this->redirectToRoute('app_vee_etape2_coordonnees');

        }
        return $this->render('vacancesEusko/etape_identite.html.twig', ['title' => $translator->trans("Identité"), 'form' => $form->createView()]);
    }

    /**
     * @Route("/vacances-en-eusko/coordonnees", name="app_vee_etape2_coordonnees")
     */
    public function etape2Coordonnees(APIToolbox $APIToolbox, Request $request, SessionInterface $session)
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
            ->add('phone', TextType::class, ['required' => true, 'attr' => array('id'=>'phone', 'placeholder' => '+33')])
            ->add('submit', SubmitType::class, ['label' => 'Valider'])
            ->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();

            $data = array_merge($session->get('utilisateur'), $data);
            $session->set('utilisateur', $data);

            return $this->redirectToRoute('app_vee_etape3_justificatif');
        }
        return $this->render('vacancesEusko/etape2_coordonnees.html.twig', ['title' => "Coordonnées", 'form' => $form->createView()]);
    }

    /**
     * @Route("/vacances-en-eusko/justificatif", name="app_vee_etape3_justificatif")
     */
    public function etape3justificatif(APIToolbox $APIToolbox, Request $request, SessionInterface $session)
    {
        $session->start();

        if($session->get('compteur') < 5){
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

            $form->handleRequest($request);
            if($form->isSubmitted() && $form->isValid()) {


            }
            return $this->render('vacancesEusko/etape3_justificatif.html.twig', ['title' => "Justificatif", 'form' => $form->createView()]);
        }
        return $this->render('vacancesEusko/etape3_erreur.html.twig');
    }

    /**
     * @Route("/vacances-en-eusko/securite", name="app_vee_etape4_securite")
     */
    public function etape4Securite(APIToolbox $APIToolbox,
                                   Request $request,
                                   TranslatorInterface $translator,
                                   SessionInterface $session,
                                   LoginFormAuthenticator $loginFormAuthenticator,
                                   GuardAuthenticatorHandler $guardAuthenticatorHandler,
                                   AuthenticationManagerInterface $authenticationManager)
    {

        $session->start();

        $questions = ['' => '','autre' => 'autre'];
        $response = $APIToolbox->curlWithoutToken('GET', '/predefined-security-questions/?language='.$request->getLocale());

        if($response['httpcode'] == 200){

            foreach ($response['data'] as $question){
                $questions[$question->question]=$question->question;
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

                $response = $APIToolbox->curlWithoutToken('POST', '/creer-compte-vee/', $data);

                if($response['httpcode'] == 201){
                    $credentials['username'] = $response['data']->login;
                    $credentials['password'] = $data['password'];

                    $user = $APIToolbox->autoLogin($credentials);

                    //Route pour la redirection après login
                    $session->set('_security.main.target_path', $this->generateUrl('app_vee_etape4_success'));

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
        return $this->render('vacancesEusko/etape4_securite.html.twig', ['form' => $form->createView()]);

    }

    /**
     * @Route("/vacances-en-eusko/bienvenue", name="app_vee_etape4_success")
     */
    public function etape4Success(APIToolbox $APIToolbox, Request $request)
    {
        return $this->render('vacancesEusko/etape4_success.html.twig', ['title' => "Bienvenue"]);
    }

    /**
     * @Route("/vacances-en-eusko/call/justificatif", name="app_vee_api_idcheck")
     */
    public function verificationJustificatif(APIToolbox $APIToolbox, Request $request, TranslatorInterface $translator, SessionInterface $session)
    {
        //INIT
        $session->start();
        $status = false;
        $response = '';

        /** @var File $file */
        $file = $request->files->get('form')['idcard'];

        if($file){
            $session->set('compteur', $session->get('compteur') + 1);
            $docBase64 = base64_encode(file_get_contents($file->getPathname()));
            $checkID = $APIToolbox->curlRequestIdCheck('POST', '/rest/v0/task/image?', ['frontImage' => $docBase64]);

            $session->set('compteur', $session->get('compteur') + 1);

            if($checkID['httpcode'] == 400){
                $this->addFlash('danger', $translator->trans("Le document n'est pas valide ou le fichier est trop lourd (maximum 4Mo)"));
            } elseif ($checkID['httpcode'] == 200){
                $status = true;
                $dataCard = json_decode($checkID["data"]);

                $naissance = $dataCard->holderDetail->birthDate;
                $data['birth'] = $naissance->year.'-'.$naissance->month.'-'.$naissance->day;

                $dataU = array_merge($session->get('utilisateur'), ['id_document' => $docBase64], $data);
                $session->set('utilisateur', $dataU);

                $response = $APIToolbox->go_nogo($checkID["data"]);
            } else {
                $this->addFlash('danger', $translator->trans("Le document n'est pas valide."));
            }

        } else {
            $this->addFlash('danger', 'Erreur fichier non reconnu');
        }

        return new JsonResponse(['bool' => $status, 'resultat' => $response]);

    }

    /**
     * @Route("/bons-plans", name="app_bons_plans")
     */
    public function bonsplans(EntityManagerInterface $em)
    {
        return $this->render('vacancesEusko/bonsPlans.html.twig');
    }

    /**
     * @Route("/bons-plans/12", name="app_bons_plans_show")
     */
    public function showOneBonPlan(EntityManagerInterface $em)
    {
        return $this->render('vacancesEusko/voirUnBonPlan.html.twig');
    }

    /**
     * @isGranted("ROLE_TOURISTE")
     * @Route("/vacances-en-eusko/fermeture-compte", name="app_vee_fermeture")
     */
    public function fermetureCompteVEE(APIToolbox $APIToolbox)
    {
        $response = $APIToolbox->curlRequest('GET', '/account-summary-adherents/');
        if($response['httpcode'] == 200) {
            $infosUser = [
                'compte' => $response['data']->result[0]->number,
                'nom' => $response['data']->result[0]->owner->display,
                'solde' => $response['data']->result[0]->status->balance
            ];
        }

        return $this->render('vacancesEusko/fermetureCompteVEE.html.twig',  ['infosUser' => $infosUser]);
    }

    /**
     * @isGranted("ROLE_TOURISTE")
     * @Route("/vacances-en-eusko/fermeture-compte/panier", name="app_vee_fermeture_panier")
     */
    public function fermetureComptePanierVEE(APIToolbox $APIToolbox, Request $request)
    {
        $response = $APIToolbox->curlRequest('GET', '/account-summary-adherents/');
        if($response['httpcode'] == 200) {
            $infosUser = [
                'compte' => $response['data']->result[0]->number,
                'nom' => $response['data']->result[0]->owner->display,
                'solde' => $response['data']->result[0]->status->balance
            ];
        }

        return $this->render('vacancesEusko/fermetureComptePanierVEE.html.twig',  [ 'infosUser' => $infosUser]);
    }

    /**
     * @isGranted("ROLE_TOURISTE")
     * @Route("/vacances-en-eusko/fermeture-compte/don", name="app_vee_fermeture_don")
     */
    public function fermetureCompteDonVEE(APIToolbox $APIToolbox, TranslatorInterface $translator, Request $request)
    {
        $response = $APIToolbox->curlRequest('GET', '/account-summary-adherents/');
        if($response['httpcode'] == 200) {
            $infosUser = [
                'compte' => $response['data']->result[0]->number,
                'nom' => $response['data']->result[0]->owner->display,
                'solde' => $response['data']->result[0]->status->balance
            ];
        }

        if($request->isMethod('POST')){
            $montantDon = $request->get('montantDon');
            $guard = $request->get('guard_check');
            if($guard == 'ok'){
                $data = ['amount' => $montantDon, 'description' => $translator->trans('Don Euskal Moneta')];
                $responseVirement = $APIToolbox->curlRequest('POST', '/execute-virement-asso-mlc/', $data);
                if($responseVirement['httpcode'] == 200) {
                    $this->addFlash('success',$translator->trans('Don effectué'));
                    if($montantDon == $infosUser['solde']){
                        //todo : appel API CLOTURE COMPTE
                        return $this->redirectToRoute('app_vee_fermeture_fin');
                    }
                    return $this->redirectToRoute('app_vee_fermeture');
                } else {
                    $this->addFlash('danger', $translator->trans("Le don n'a pas pu être effectué"));
                }
            }
        }

        return $this->render('vacancesEusko/fermetureCompteDonVEE.html.twig',  [ 'infosUser' => $infosUser]);
    }

    /**
     * @isGranted("ROLE_TOURISTE")
     * @Route("/vacances-en-eusko/fermeture-compte/solde", name="app_vee_fermeture_solde")
     */
    public function fermetureCompteIBANVEE(APIToolbox $APIToolbox, TranslatorInterface $translator, Request $request)
    {
        $response = $APIToolbox->curlRequest('GET', '/account-summary-adherents/');
        if($response['httpcode'] == 200) {
            $amount = $response['data']->result[0]->status->balance;
        }

        if($request->isMethod('POST')){
            $iban = str_replace(' ','', $request->get('iban'));
            $guard = $request->get('guard_check');
            if($guard == 'ok' && $this->isValidIBAN($iban)){
                $data = ['amount' => $amount, 'description' => $translator->trans('Reconversion - fermeture compte')];
                $responseVirement = $APIToolbox->curlRequest('POST', '/execute-virement-asso-mlc/', $data);
                if($responseVirement['httpcode'] == 200) {

                    $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
                    $membre = $responseMember['data'][0];
                    $responseIBAN = $APIToolbox->curlRequest('PATCH', '/members/'.$membre->id.'/', ['options_iban' => $iban]);
                    if($responseIBAN['httpcode'] == 200) {
                        //todo : appel API CLOTURE COMPTE
                        return $this->redirectToRoute('app_vee_fermeture_fin');
                    }
                }
                $this->addFlash('danger', $translator->trans("La fermeture du compte n'a pas pu être effectuée. "));

            } else {
                $this->addFlash('danger', $translator->trans("Votre IBAN n'est pas valide"));
            }
        }

        return $this->render('vacancesEusko/fermetureCompteSoldeVEE.html.twig',  []);
    }

    /**
     * @Route("/vacances-en-eusko/fermeture-compte/fin", name="app_vee_fermeture_fin")
     */
    public function fermetureCompteFinVEE()
    {
        return $this->render('vacancesEusko/fermetureCompteFinVEE.html.twig');
    }


    function isValidIBAN ($iban) {

        $iban = strtolower($iban);
        $Countries = array(
            'al'=>28,'ad'=>24,'at'=>20,'az'=>28,'bh'=>22,'be'=>16,'ba'=>20,'br'=>29,'bg'=>22,'cr'=>21,'hr'=>21,'cy'=>28,'cz'=>24,
            'dk'=>18,'do'=>28,'ee'=>20,'fo'=>18,'fi'=>18,'fr'=>27,'ge'=>22,'de'=>22,'gi'=>23,'gr'=>27,'gl'=>18,'gt'=>28,'hu'=>28,
            'is'=>26,'ie'=>22,'il'=>23,'it'=>27,'jo'=>30,'kz'=>20,'kw'=>30,'lv'=>21,'lb'=>28,'li'=>21,'lt'=>20,'lu'=>20,'mk'=>19,
            'mt'=>31,'mr'=>27,'mu'=>30,'mc'=>27,'md'=>24,'me'=>22,'nl'=>18,'no'=>15,'pk'=>24,'ps'=>29,'pl'=>28,'pt'=>25,'qa'=>29,
            'ro'=>24,'sm'=>27,'sa'=>24,'rs'=>22,'sk'=>24,'si'=>19,'es'=>24,'se'=>24,'ch'=>21,'tn'=>24,'tr'=>26,'ae'=>23,'gb'=>22,'vg'=>24
        );
        $Chars = array(
            'a'=>10,'b'=>11,'c'=>12,'d'=>13,'e'=>14,'f'=>15,'g'=>16,'h'=>17,'i'=>18,'j'=>19,'k'=>20,'l'=>21,'m'=>22,
            'n'=>23,'o'=>24,'p'=>25,'q'=>26,'r'=>27,'s'=>28,'t'=>29,'u'=>30,'v'=>31,'w'=>32,'x'=>33,'y'=>34,'z'=>35
        );

        if (strlen($iban) != $Countries[ substr($iban,0,2) ]) { return false; }

        $MovedChar = substr($iban, 4) . substr($iban,0,4);
        $MovedCharArray = str_split($MovedChar);
        $NewString = "";

        foreach ($MovedCharArray as $k => $v) {

            if ( !is_numeric($MovedCharArray[$k]) ) {
                $MovedCharArray[$k] = $Chars[$MovedCharArray[$k]];
            }
            $NewString .= $MovedCharArray[$k];
        }
        if (function_exists("bcmod")) { return bcmod($NewString, '97') == 1; }

        // http://au2.php.net/manual/en/function.bcmod.php#38474
        $x = $NewString; $y = "97";
        $take = 5; $mod = "";

        do {
            $a = (int)$mod . substr($x, 0, $take);
            $x = substr($x, $take);
            $mod = $a % $y;
        }
        while (strlen($x));

        return (int)$mod == 1;
    }


}
