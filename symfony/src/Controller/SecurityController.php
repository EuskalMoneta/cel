<?php

namespace App\Controller;


use App\Security\LoginFormAuthenticator;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\RepeatedType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Guard\GuardAuthenticatorHandler;
use Symfony\Component\Security\Http\Authentication\AuthenticationUtils;
use Symfony\Component\Security\Http\Util\TargetPathTrait;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Contracts\Translation\TranslatorInterface;

class SecurityController extends AbstractController
{
    use TargetPathTrait;

    /**
     * @Route("/{_locale}/login",  locale="fr", name="app_login")
     */
    public function login(AuthenticationUtils $authenticationUtils, EntityManagerInterface $em): Response
    {
        if ($this->getUser()) {
            $this->redirectToRoute('app_homepage');
        }

        $promotions = $em->getRepository('App:Promotion')->findBy(['visible' => true]);

        shuffle ($promotions);
        // get the login error if there is one
        $error = $authenticationUtils->getLastAuthenticationError();
        // last username entered by the user
        $lastUsername = $authenticationUtils->getLastUsername();

        return $this->render('security/login.html.twig', ['last_username' => $lastUsername, 'error' => $error, 'promotions' => $promotions]);
    }

    /**
     * @Route("/creer-compte", name="app_creer_compte")
     */
    public function creerCompte(Request $request): Response
    {
        if($request->isMethod('post')){
            $request->getSession()->set('_locale', $request->get('locale'));
            $targetPath = $this->getTargetPath($request->getSession(), 'main');
            return $this->redirectToRoute('app_creer_compte');
        }
        return $this->render('security/creerCompte.html.twig');
    }

    /**
     * @Route("/{_locale}/activer-compte", name="app_first_login")
     */
    public function firstLogin(Request $request, APIToolbox $APIToolbox): Response
    {
        $form = $this->createFormBuilder()
            ->add('adherent', TextType::class, [
                'label' => 'N° Adhérent',
                'required' => true,
                'help' => 'Format: E12345',
                'constraints' => [
                    new NotBlank(),
                    new Length(['min' => 6, 'max'=> 6]),
                ],
            ])
            ->add('email', EmailType::class, [
                'label' => 'Email',
                'required' => true,
                'help' => "Renseignez l'email que vous avez utilisé lors de votre adhésion à l'eusko",
                'constraints' => [
                    new NotBlank()
                ]
            ])
            ->add('submit', SubmitType::class, ['label' => 'Valider'])
            ->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {

            $data = $form->getData();
            $response = $APIToolbox->curlWithoutToken('POST', '/first-connection/', ['login' => $data['adherent'], 'email' => $data['email'], 'language' => $request->getLocale()]);

            if($data['adherent'][0] == 'T'){
                $this->addFlash('danger', 'Les comptes eusko en vacances n\'ont pas besoin d\'activation. Essayez de vous connecter ou de faire une réinitialisation de mot de passe.');
            } elseif($response['httpcode'] == 200 && $response['data']->member == 'OK'){
                return $this->render('security/firstLoginSuccess.html.twig', []);
            } else {
                if($response['data']->error == 'User already exist!'){
                    $this->addFlash('danger', 'Ce compte semble être déjà activé, essayez de vous connecter ou faire une réinitialisation de mot de passe.');
                } else {
                    $this->addFlash('danger', 'Erreur : '.$response['data']->error);
                }
            }

        }
        return $this->render('security/firstLogin.html.twig', ['title' => "Activer votre compte", 'form' => $form->createView()]);
    }

    /**
     * @Route("/{_locale}/valide-premiere-connexion", name="app_valide_first_login")
     */
    public function validateFirstLogin(Request $request,
                                       APIToolbox $APIToolbox,
                                       TranslatorInterface $translator,
                                       GuardAuthenticatorHandler $guardAuthenticatorHandler,
                                       LoginFormAuthenticator $loginFormAuthenticator)
    {
        $questions = ['' => '','autre' => 'autre'];
        $response = $APIToolbox->curlWithoutToken('GET', '/predefined-security-questions/?language='.$request->getLocale());

        if($response['httpcode'] == 200){

            foreach ($response['data'] as $question){
                $questions[$question->question]=$question->question;
            }

            $form = $this->createFormBuilder()
                ->add('motDePasse', RepeatedType::class, [
                    'first_options'  => ['label' => $translator->trans('Nouveau mot de passe')],
                    'second_options' => ['label' => $translator->trans('Confirmer le nouveau mot de passe')],
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
                ->add('reponse', TextType::class, [
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
                $parameters = [
                    'token' => $request->query->get('token'),
                    'new_password' => $data['motDePasse'],
                    'confirm_password' => $data['motDePasse'],
                    'answer' => $data['reponse'],
                    ];

                if($data['questionSecrete'] == 'autre'){
                    $parameters['question'] = $data['questionPerso'];
                } else {
                    $parameters['question'] = $data['questionSecrete'];
                }
                $response = $APIToolbox->curlWithoutToken('POST', '/validate-first-connection/', $parameters);

                if ($response['httpcode'] == 200) {
                    $credentials['username'] = $response['data']->login;
                    $credentials['password'] = $data['motDePasse'];

                    $user = $APIToolbox->autoLogin($credentials);

                    return $guardAuthenticatorHandler
                        ->authenticateUserAndHandleSuccess(
                            $user,
                            $request,
                            $loginFormAuthenticator,
                            'main'
                        );
                } else {
                    $this->addFlash('danger', $translator->trans('Erreur lors de la validation de vos données, merci de re-essayer ou de contacter un administrateur.'));
                }
            }
        }
        return $this->render('security/validatePremiereConnexion.html.twig', ['form' => $form->createView()]);
    }

    /**
     * @Route("/{_locale}/passe-perdu", name="app_lost_password")
     */
    public function lostPassword(Request $request, APIToolbox $APIToolbox): Response
    {
        $locale = $request->getLocale();
        $form = $this->createFormBuilder()
            ->add('adherent', TextType::class, [
                'label' => 'N° Adhérent',
                'required' => true,
                'help' => 'Format: E12345',
                'constraints' => [
                    new NotBlank(),
                    new Length(['min' => 6, 'max'=> 6]),
                ],
            ])
            ->add('email', EmailType::class, [
                'label' => 'Email',
                'required' => true,
                'help' => "Renseignez l'email que vous avez utilisé lors de votre adhésion à l'eusko",
                'constraints' => [
                    new NotBlank()
                ]
            ])
            ->add('submit', SubmitType::class, ['label' => 'Valider'])
            ->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();
            $response = $APIToolbox->curlWithoutToken('POST', '/lost-password/', ['login' => $data['adherent'], 'email' => $data['email'], 'language' => $locale]);

            if($response['httpcode'] == 200 && $response['data']->member == 'OK'){
                $this->addFlash('success', 'Veuillez vérifier vos emails. Vous allez recevoir un message qui vous donnera accès à un formulaire où vous pourrez choisir votre mot de passe.');
            } else {
                $this->addFlash('danger', 'Erreur de communication avec le serveur api');
            }
        }
        return $this->render('security/passePerdu.html.twig', ['title' => 'Mot de passe oublié', 'form' => $form->createView()]);
    }

    /**
     * @Route("/{_locale}/valide-passe-perdu", name="app_valide_passe_perdu")
     */
    public function validatePassePerdu(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator): Response
    {
        $token = $request->query->get('token');
        $responseToken = $APIToolbox->curlWithoutToken('GET', '/securityqa/me/?token='.$token);
        $securityQuestion = '';

        if($responseToken['httpcode'] == 200){
            $securityQuestion = $responseToken['data']->question->question;
        } else {
            $this->addFlash('danger', 'Erreur lors de la connexion avec l\'API : '.$responseToken['data']->error);
        }

        $form = $this->createFormBuilder()
            ->add('motDePasse', RepeatedType::class, [
                'first_options'  => ['label' => 'Nouveau mot de passe'],
                'second_options' => ['label' => 'Confirmer le nouveau mot de passe'],
                'constraints' => [
                    new NotBlank(),
                    new Length(['min' => 4, 'max'=> 12]),
                ],
                'type' => PasswordType::class,
                'options' => ['attr' => ['class' => 'password-field']],
                'required' => true,
            ])
            ->add('reponse', TextType::class, [
                'label' => ' ',
                'required' => false,
                'constraints' => [
                    new NotBlank()
                ]
            ])
            ->add('submit', SubmitType::class, ['label' => 'Valider'])
            ->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();
            $parameters = [
                'token' => $token,
                'new_password' => $data['motDePasse'],
                'confirm_password' => $data['motDePasse'],
                'answer' => $data['reponse'],
            ];

            $response = $APIToolbox->curlWithoutToken('POST', '/validate-lost-password/', $parameters);


            if($response['httpcode'] == 200 && $response['data']->status == 'success'){
                $this->addFlash('success', $translator->trans('Mot de passe changé avec succès, vous pouvez vous connecter avec vos identifiants.'));
                return $this->redirectToRoute('app_login');
            } else {
                $this->addFlash('danger', $translator->trans('Erreur lors de la validation de vos données, merci de re-essayer ou de contacter un administrateur.'));
            }
        }

        return $this->render('security/validePassePerdu.html.twig', ['form' => $form->createView(), 'question' => $securityQuestion]);
    }

    /**
     * @Route("/logout", name="app_logout")
     */
    public function logout()
    {
        throw new \Exception('This method can be blank - it will be intercepted by the logout key on your firewall');
    }

    /**
     * @Route("/valide/cgu", name="app_accept_cgu")
     */
    public function valideCGU(APIToolbox $APIToolbox, Request $request, TranslatorInterface $translator)
    {
        //form generation
        $form = $this->createFormBuilder()
            ->add('valide', CheckboxType::class, ['label' => "J'ai lu et je valide les CGU", 'required' => true])
            ->add('submit', SubmitType::class, ['label' => 'Valider', 'attr' => ['class' => 'btn-success btn']])
            ->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $accept = $form->getData()['valide'];
            if($accept){
                $response = $APIToolbox->curlRequest('POST', '/accept-cgu/', []);
                if($response['httpcode'] == 200 && $response['data']->status == 'OK'){
                    $this->addFlash('success', $translator->trans('Merci d\'avoir accepté les CGU'));
                    return $this->redirectToRoute('app_homepage');
                }
            }
        }
        return $this->render('security/valideCGU.html.twig', ['form' => $form->createView()]);
    }

}
