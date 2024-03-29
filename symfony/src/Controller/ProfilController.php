<?php

namespace App\Controller;

use App\Security\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\CountryType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\RepeatedType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormEvent;
use Symfony\Component\Form\FormEvents;
use Symfony\Component\Form\FormInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Contracts\Translation\TranslatorInterface;

class ProfilController extends AbstractController
{
    /**
     * @Route("/profil", name="app_profil")
     */
    public function index(APIToolbox $APIToolbox)
    {

        $response = $APIToolbox->curlRequest('GET', '/account-summary-adherents/');
        if($response['httpcode'] == 200) {
            $infosUser = [
                'compte' => $response['data']->result[0]->number,
                'nom' => $response['data']->result[0]->owner->display,
                'solde' => $response['data']->result[0]->status->balance
            ];

            $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());

            return $this->render('profil/profil.html.twig', ['infosUser' => $infosUser, 'membre' => $responseMember['data'][0]]);
        } else {
            throw new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
        }
    }

    /**
     * @Route("/profil/password", name="app_profil_password")
     */
    public function password(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator)
    {
        $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMember['httpcode'] == 200) {

            $membre = $responseMember['data'][0];

            $form = $this->createFormBuilder()
                ->add('old_password', PasswordType::class, ['label' => $translator->trans('profil.mot_de_passe.ancien_mot_de_passe')])
                ->add('new_password', RepeatedType::class, [
                    'first_options'  => ['label' => $translator->trans('profil.mot_de_passe.nouveau_mot_de_passe')],
                    'second_options' => ['label' => $translator->trans('profil.mot_de_passe.confirmer_nouveau_mot_de_passe')],
                    'constraints' => [
                        new NotBlank(),
                        new Length(['min' => 4, 'max'=> 12]),
                    ],
                    'type' => PasswordType::class,
                    'options' => ['attr' => ['class' => 'password-field']],
                    'required' => true,
                ])
                ->add('submit', SubmitType::class, ['label' => 'Enregistrer'])
                ->getForm();


            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {
                $data = $form->getData();
                $data['confirm_password'] = $data['new_password'];
                $data['cyclos_mode'] = 'cel';

                $responseProfile = $APIToolbox->curlRequest('POST', '/change-password/', $data);

                if($responseProfile['httpcode'] == 200) {
                    $this->addFlash('success',$translator->trans('Les modifications ont bien été prises en compte'));
                    return $this->redirectToRoute('app_profil');
                } else {
                    $this->addFlash('danger', $translator->trans("La modification n'a pas pu être effectuée"));
                }
            }

            return $this->render('profil/password.html.twig', ['form' => $form->createView()]);

        } else {
            throw new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
        }
    }

    /**
     * @Route("/profil/init-pin", name="app_profil_init_pin")
     */
    public function init_pin(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator)
    {
        return $this->set_pin($request, $APIToolbox, $translator, true);
    }

    /**
     * @Route("/profil/pin", name="app_profil_pin")
     */
    public function update_pin(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator)
    {
        return $this->set_pin($request, $APIToolbox, $translator, false);
    }

    private function set_pin(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator, bool $forcedPin)
    {
        $form = $this->createFormBuilder()
            ->add('pin', RepeatedType::class, [
                'first_options'  => ['label' => 'Code PIN (4 chiffres)'],
                'second_options' => ['label' => 'Confirmer le code'],
                'constraints' => [
                    new NotBlank(),
                    new Length(['min' => 4, 'max'=> 4]),
                ],
                'type' => PasswordType::class,
                'options' => ['attr' => ['class' => 'password-field']],
                'required' => true,
            ])
            ->add('submit', SubmitType::class, ['label' => 'Enregistrer'])
            ->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();
            $data['pin2'] = $data['pin'];

            $responseProfile = $APIToolbox->curlRequest('POST', '/euskokart-upd-pin/', $data);

            if($responseProfile['httpcode'] == 200) {
                $this->addFlash('success',$translator->trans('Les modifications ont bien été prises en compte'));
                if ($forcedPin) {
                    return $this->redirectToRoute('app_homepage');
                }
                return $this->redirectToRoute('app_profil');
            } else {
                $this->addFlash('danger', $translator->trans("La modification n'a pas pu être effectuée"));
            }
        }

        return $this->render('profil/pin.html.twig', ['form' => $form->createView(), 'forcedPin' => $forcedPin]);
    }

    /**
     * @Route("/profil/cotisation", name="app_profil_cotisation")
     */
    public function cotisation(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator, AuthorizationCheckerInterface $authChecker)
    {
        $forcedCotisation = false;

        $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMember['httpcode'] == 200) {

            $membre = $responseMember['data'][0];

            if($membre->array_options->options_prelevement_auto_cotisation_eusko != 1){
                $forcedCotisation = true;
            }
            if((new \DateTime())->setTimestamp($membre->last_subscription_date_end) < new \DateTime("now") and $authChecker->isGranted('ROLE_CLIENT')){
                $forcedCotisation = true;
            }

            if($membre->array_options->options_prelevement_cotisation_periodicite == 1){
                $defaultData = $membre->array_options->options_prelevement_cotisation_montant * 12;
            } else {
                $defaultData = $membre->array_options->options_prelevement_cotisation_montant;
            }

            $form = $this->createFormBuilder()
                ->add('options_prelevement_cotisation_montant', ChoiceType::class, [
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
                    'data' => round($defaultData, 0)
                ])
                ->add('options_prelevement_cotisation_periodicite', ChoiceType::class, [
                    'label' => $translator->trans('cotisation.periodicite'),
                    'required' => true,
                    'multiple' => false,
                    'expanded' => true,
                    'choices' => [
                        $translator->trans('cotisation.periodicite.annuel') => '12',
                        $translator->trans('cotisation.periodicite.mensuel') => '1',
                    ],
                    'data' => round($membre->array_options->options_prelevement_cotisation_periodicite, 0)
                ])
                ->add('submit', SubmitType::class, ['label' => 'Enregistrer'])
                ->getForm();


            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {
                $data = $form->getData();
                $data['options_prelevement_auto_cotisation_eusko'] = 1;
                if($data['options_prelevement_cotisation_periodicite'] == 1){
                    //To get the amount per month and not annualy
                    $data['options_prelevement_cotisation_montant'] = $data['options_prelevement_cotisation_montant'] / 12;
                }

                if(!($data['options_prelevement_cotisation_periodicite'] == 1 && $data['options_prelevement_cotisation_montant'] == 5)){
                    $responseProfile = $APIToolbox->curlRequest('PATCH', '/members/'.$membre->id.'/', $data);

                    if($responseProfile['httpcode'] == 200) {
                        $this->addFlash('success',$translator->trans('Les modifications ont bien été prises en compte'));

                        if($forcedCotisation){
                            return $this->redirectToRoute('app_homepage');
                        }
                        return $this->redirectToRoute('app_profil');
                    } else {
                        $this->addFlash('danger', $translator->trans("La modification n'a pas pu être effectuée"));
                    }
                }

            }
            return $this->render('profil/cotisation.html.twig', ['form' => $form->createView(), 'membre' => $membre, 'forcedCotisation' => $forcedCotisation]);
        } else {
            throw new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
        }
    }

    /**
     * @Route("/profil/question", name="app_profil_question")
     */
    public function question(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator)
    {
        $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMember['httpcode'] == 200) {

            $membre = $responseMember['data'][0];

            $questions = ['' => '', $translator->trans('Question personnalisée') => 'autre'];
            $response = $APIToolbox->curlWithoutToken('GET', '/predefined-security-questions/?language='.$request->getSession()->get('_locale'));

            if($response['httpcode'] == 200){

                foreach ($response['data'] as $question){
                    $questions[$question->question]=$question->question;
                }

                $form = $this->createFormBuilder()
                    ->add('questionSecrete', ChoiceType::class, [
                        'label' => $translator->trans('profil.question_secrete.question'),
                        'required' => true,
                        'choices' => $questions
                    ])
                    ->add('questionPerso', TextType::class, ['label' => 'Votre question personnalisée', 'required' => false])
                    ->add('reponse', TextType::class, [
                        'label' => $translator->trans('profil.question_secrete.reponse'),
                        'required' => true,
                        'constraints' => [
                            new NotBlank()
                        ]
                    ])
                    ->add('submit', SubmitType::class, ['label' => 'Enregistrer'])
                    ->getForm();


                $form->handleRequest($request);
                if ($form->isSubmitted() && $form->isValid()) {
                    $data = $form->getData();

                    $parameters['answer'] = $data['reponse'];
                    if($data['questionSecrete'] == 'autre'){
                        $parameters['question'] = $data['questionPerso'];
                    } else {
                        $parameters['question'] = $data['questionSecrete'];
                    }

                    $responseProfile = $APIToolbox->curlRequest('PATCH', '/securityqa/me/', $parameters);

                    if($responseProfile['httpcode'] == 200) {
                        $this->addFlash('success',$translator->trans('Les modifications ont bien été prises en compte'));
                        return $this->redirectToRoute('app_profil');
                    } else {
                        $this->addFlash('danger', $translator->trans("La modification n'a pas pu être effectuée"));
                    }
                }

                return $this->render('profil/question.html.twig', ['form' => $form->createView()]);
            }
        }
        throw new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");

    }

    /**
     * @Route("/ajax/zipcode/search", name="app_ajex_zipcode_search")
     */
    public function jsonBeneficiaire(Request $request, APIToolbox $APIToolbox)
    {
        $response = $APIToolbox->curlWithoutToken('GET', '/towns/?zipcode='.$request->get('q'));
        $tabBenef = [];

        if($response['httpcode'] == 200){
            foreach ($response['data'] as $zip){
                $tabBenef[] = [$zip->zip.' -- '.$zip->town];
            }
            return new JsonResponse($tabBenef);
        } else {
            throw new NotFoundHttpException("Methode non disponible ou erreur RQ");
        }

    }

    /**
     * @Route("/profil/coordonnees", name="app_profil_coordonnees")
     */
    public function coordonnees(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator)
    {
        $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMember['httpcode'] == 200) {
            $membre = $responseMember['data'][0];

            $responseCountries = $APIToolbox->curlRequest('GET', '/countries/');
            $tabCountries = [];
            foreach ($responseCountries['data'] as $country){
                if($country->label == '-'){
                    $tabCountries[$country->label] = '';
                } else {
                    $tabCountries[$country->label] = $country->id;
                }
            }

            $formBuilder = $this->createFormBuilder();
            if ($membre->type === 'Particulier' || $membre->type === 'Touriste') {
                $formBuilder->add('birth', DateType::class, [
                    'widget' => 'single_text',
                    'required' => true,
                    'data' => (new \DateTime())->setTimestamp($membre->birth)
                ]);
            }
            $formBuilder
                ->add('address', TextareaType::class, ['required' => true, 'data' => $membre->address])
                ->add('zip', TextType::class, ['required' => true, 'data' => $membre->zip, 'attr' => ['class' => 'basicAutoComplete']])
                ->add('town', TextType::class, ['required' => true, 'data' => $membre->town])
                ->add('country_id', ChoiceType::class, ['required' => true, 'choices' => $tabCountries, 'data' => $membre->country_id]);
            if ($membre->type === 'Particulier' || $membre->type === 'Touriste') {
                $formBuilder->add('phone_mobile', TextType::class, ['required' => true, 'data' => $membre->phone_mobile]);
            } else {
                $formBuilder->add('phone', TextType::class, ['label' => 'Téléphone pro', 'required' => true, 'data' => $membre->phone]);
            }
            $formBuilder
                ->add('email', TextType::class, ['required' => true, 'data' => $membre->email])
                ->add('submit', SubmitType::class, ['label' => 'Enregistrer']);
            $form = $formBuilder->getForm();

            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {
                $data = $form->getData();
                if (isset($data['birth'])) {
                    $data['birth'] = $data['birth']->format('d/m/Y');
                }
                $responseMember = $APIToolbox->curlRequest('PATCH', '/members/'.$membre->id.'/', $data);

                if($responseMember['httpcode'] == 200) {
                    $this->addFlash('success',$translator->trans('Les modifications ont bien été prises en compte'));
                    return $this->redirectToRoute('app_profil');
                } else {
                    $this->addFlash('danger', $translator->trans("La modification n'a pas pu être effectuée"));
                }
            }

            return $this->render('profil/coordonnees.html.twig', ['form' => $form->createView()]);

        } else {
            throw new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
        }
    }


    /**
     * @Route("/profil/langue", name="app_profil_langue")
     */
    public function langue(Request $request, APIToolbox $APIToolbox, SessionInterface $session, TranslatorInterface $translator)
    {
        $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMember['httpcode'] == 200) {

            $membre = $responseMember['data'][0];
            $langue = $membre->array_options->options_langue;

            $form = $this->createFormBuilder()
                ->add('langue', ChoiceType::class,
                    [
                        'choices' => ['Euskara' =>'eu', 'Français' => 'fr'],
                        'required' => true,
                        'data' => $langue
                    ])
                ->add('submit', SubmitType::class, ['label' => 'Enregistrer'])
                ->getForm();

            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {
                $data = $form->getData();
                $responseLang = $APIToolbox->curlRequest('PATCH', '/members/'.$membre->id.'/', ['options_langue' => $data['langue']]);

                if($responseLang['httpcode'] == 200) {
                    $session->set('_locale', $data['langue']);
                    $this->addFlash('success',$translator->trans('Langue mise à jour.', [], null, $data['langue']));
                    return $this->redirectToRoute('app_profil');
                } else {
                    $this->addFlash('danger', $translator->trans('Le changement de langue n\'a pas pu être effectué', [], null, $data['langue']));
                }
            }

            return $this->render('profil/langue.html.twig', ['form' => $form->createView()]);

        } else {
            throw new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
        }
    }

    /**
     * @Route("/profil/newsletter", name="app_profil_newsletter")
     */
    public function newsletter(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator)
    {
        $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMember['httpcode'] == 200) {

            $membre = $responseMember['data'][0];
            $booleanNewsletter = $membre->array_options->options_recevoir_actus;

            $form = $this->createFormBuilder()
                ->add('news', ChoiceType::class,
                    [
                        'label' => $translator->trans("Je recevrai 2 ou 3 mails par mois pour rester au courant des actualités de l'Eusko."),
                        'choices' => ['Oui' =>'1', 'Non' => '0'],
                        'data' => $booleanNewsletter
                    ])
                ->add('submit', SubmitType::class, ['label' => $translator->trans('Enregistrer')])
                ->getForm();

            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {
                $data = $form->getData();
                $response = $APIToolbox->curlRequest('PATCH', '/members/'.$membre->id.'/', ['options_recevoir_actus' => $data['news']]);

                if($response['httpcode'] == 200) {
                    $this->addFlash('success',$translator->trans('Les modifications ont bien été prises en compte'));
                    return $this->redirectToRoute('app_profil');
                } else {
                    $this->addFlash('danger', $translator->trans("La modification n'a pas pu être effectuée"));
                }
            }

            return $this->render('profil/newsletter.html.twig', ['form' => $form->createView()]);

        } else {
            throw new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
        }
    }

    /**
     * @Route("/profil/bonsplans", name="app_profil_bons_plans")
     */
    public function bonplans(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator)
    {
        $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMember['httpcode'] == 200) {

            $membre = $responseMember['data'][0];
            
            $booleanNewsletter = $membre->array_options->options_recevoir_bons_plans;

            $form = $this->createFormBuilder()
                ->add('news', ChoiceType::class,
                    [
                        'label' => $translator->trans("Je souhaite afficher les bons plans proposés par l'Eusko. "),
                        'help' => '',
                        'choices' => ['Oui' =>'1', 'Non' => '0'],
                        'data' => $booleanNewsletter
                    ])
                ->add('submit', SubmitType::class, ['label' => $translator->trans('Enregistrer')])
                ->getForm();

            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {
                $data = $form->getData();
                $response = $APIToolbox->curlRequest('PATCH', '/members/'.$membre->id.'/', ['options_recevoir_bons_plans' => $data['news']]);

                if($response['httpcode'] == 200) {
                    $this->addFlash('success',$translator->trans('Les modifications ont bien été prises en compte'));
                    return $this->redirectToRoute('app_profil');
                } else {
                    $this->addFlash('danger', $translator->trans("La modification n'a pas pu être effectuée"));
                }
            }

            return $this->render('profil/bonsPlans.html.twig', ['form' => $form->createView()]);

        } else {
            throw new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
        }
    }

    /**
     * Methode pour la pop up de la page d'accueil
     * @Route("/ajax/bonPlans/{booleen}", name="app_set_bon_plans")
     */
    public function setBonPlans($booleen, Request $request, APIToolbox $APIToolbox)
    {
        $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());

        if($responseMember['httpcode'] == 200) {

            $membre = $responseMember['data'][0];


            $response = $APIToolbox->curlRequest('PATCH', '/members/'.$membre->id.'/', ['options_recevoir_bons_plans' => $booleen]);

            if($response['httpcode'] == 200) {
                return new JsonResponse(true);
            } else {
                return new JsonResponse(false);
            }
        }

    }

    /**
     * @Route("/profil/notifications", name="app_profil_notifications")
     */
    public function notifications(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator)
    {
        $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMember['httpcode'] == 200) {

            $membre = $responseMember['data'][0];
            $options_notifications_virements = $membre->array_options->options_notifications_virements;
            $options_notifications_prelevements = $membre->array_options->options_notifications_prelevements;

            $form = $this->createFormBuilder()
                ->add('options_notifications_virements', ChoiceType::class,
                    [
                        'label' => $translator->trans('Virement reçu'),
                        'help' => $translator->trans('Vous recevrez un email pour chaque virement reçu.'),
                        'choices' => [$translator->trans('Oui') =>'1', $translator->trans('Non') => '0'],
                        'data' => $options_notifications_virements
                    ])
                ->add('options_notifications_prelevements', ChoiceType::class,
                    [
                        'label' => $translator->trans('Prélèvement effectué sur votre compte'),
                        'help' => $translator->trans('Vous recevrez un email pour chaque prélèvement effectué sur votre compte.'),
                        'choices' => [$translator->trans('Oui') =>'1', $translator->trans('Non') => '0'],
                        'data' => $options_notifications_prelevements
                    ])
                ->add('submit', SubmitType::class, ['label' => 'Enregistrer'])
                ->getForm();

            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {
                $data = $form->getData();
                $response = $APIToolbox->curlRequest('PATCH', '/members/'.$membre->id.'/', $data);
                if($response['httpcode'] == 200) {


                    $this->addFlash('success',$translator->trans('Les modifications ont bien été prises en compte'));
                    return $this->redirectToRoute('app_profil');
                } else {
                    $this->addFlash('danger', $translator->trans("La modification n'a pas pu être effectuée"));
                }
            }

            return $this->render('profil/notifications.html.twig', ['form' => $form->createView()]);

        } else {
            throw new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
        }
    }


}
