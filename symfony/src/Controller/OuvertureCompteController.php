<?php

namespace App\Controller;

use App\Security\LoginFormAuthenticator;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\RepeatedType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\Authentication\AuthenticationManagerInterface;
use Symfony\Component\Security\Guard\GuardAuthenticatorHandler;
use Symfony\Component\Validator\Constraints\File as FileConstraint;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Contracts\Translation\TranslatorInterface;
use WiziYousignClient\WiziSignClient;

class OuvertureCompteController extends AbstractController
{
    /**
     * @Route("/ouverture/compte", name="ouverture_compte")
     */
    public function index()
    {
        $youSignClient = new WiziSignClient('04794964049fddf38ba7bd43daa177ef', 'test');

        $resp = $youSignClient->newProcedure(__DIR__.'/../../public/images/note.pdf');

        dump($resp);
        $members = array(
            array(
                'firstname' => 'Clément',
                'lastname' => 'larrieu',
                'email' => 'contact@glukose.fr',
                'phone' => '0660959143',
                'fileObjects' => array(
                    array(
                        'file' => $youSignClient->getIdfile(),
                        'page' => 1,
                        'position' => "230,499,464,589",
                        'mention' => "Read and approved",
                        "mention2" =>"Signed by John Doe"

                    )
                )


            )
        );

        /**
         * On termine la procedure de création de signature en envoyant la liste des utilisateurs , un titre a la signature, une description à la signature
         */
        $response = $youSignClient->addMembersOnProcedure($members,'encore une nouvelle signature','signature généré par le client php WiziYousignClient');
        $member = json_decode($response);

        dump($member);


        return $this->render('ouverture_compte/index.html.twig', [
            'memberToken' => $member->members[0]->id,
            'controller_name' => 'OuvertureCompteController',
        ]);
    }

    /**
     * @Route("/ouverture/compte/validatin-sepa", name="ouverture_compte_validation_sepa")
     */
    public function validationSepa()
    {

    }

    /**
     * @Route("/ouverture/compte/identite", name="app_ouverture_etape1_identite")
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
     * @Route("/ouverture/compte/coordonnees", name="app_compte_etape2_coordonnees")
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

            return $this->redirectToRoute('app_compte_etape3_justificatif');
        }
        return $this->render('ouverture_compte/etape2_coordonnees.html.twig', ['title' => "Coordonnées", 'form' => $form->createView()]);
    }

    /**
     * @Route("/ouverture/compte/justificatif", name="app_compte_etape3_justificatif")
     */
    public function etape3justificatif(SessionInterface $session)
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

            return $this->render('ouverture_compte/etape3_justificatif.html.twig', ['title' => "Justificatif", 'form' => $form->createView()]);
        }
        return $this->render('ouverture_compte/etape3_erreur.html.twig');
    }

    /**
     * @Route("/ouverture/compte/sepa", name="app_compte_etape4_sepa")
     */
    public function etape4Sepa(SessionInterface $session) {
        return $this->render('ouverture_compte/index.html.twig', [
            'memberToken' => 'toto',
            'controller_name' => 'OuvertureCompteController',
        ]);

    }


    /**
     * @Route("/ouverture/compte/securite", name="app_compte_etape5_securite")
     */
    public function etape5Securite(APIToolbox $APIToolbox,
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

                //todo: Appel API création user
                $response = $APIToolbox->curlWithoutToken('POST', '/creer-compte-vee/', $data);
                /*$userData = array_merge($session->get('utilisateur'), $parameters);
                $session->set('utilisateur', $userData);
                dump($session->get('utilisateur'));*/
                /*if($response['httpcode'] == 200 && $response['data']->status == 'success'){
                    $this->addFlash('success', 'Compte validé, vous pouvez vous connecter avec vos identifiants.');
                    return $this->redirectToRoute('app_login');
                } else {
                    $this->addFlash('danger', 'Erreur lors de la validation de vos données, merci de re-essayer ou de contacter un administrateur.');
                }*/

                //todo : changer l'username par le retour de la fonction de création
                $credentials['username'] = 'TOTO';
                $credentials['password'] = $data['password'];

                $user = $APIToolbox->autoLogin($credentials);

                return $guardAuthenticatorHandler
                    ->authenticateUserAndHandleSuccess(
                        $user,
                        $request,
                        $loginFormAuthenticator,
                        'main'
                    );

            }
        }
        return $this->render('ouverture_compte/etape5_securite.html.twig', ['form' => $form->createView()]);

    }

    /**
     * @Route("/ouverture/compte/bienvenue", name="app_compte_etape5_success")
     */
    public function etape5Success(APIToolbox $APIToolbox, Request $request)
    {
        return $this->render('ouverture_compte/etape5_success.html.twig', ['title' => "Bienvenue"]);
    }
}
