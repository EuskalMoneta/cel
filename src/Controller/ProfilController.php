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
            return new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
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
                ->add('old_password', PasswordType::class, ['label' => 'Ancien mot de passe'])
                ->add('new_password', RepeatedType::class, [
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
                ->add('submit', SubmitType::class, ['label' => 'Enregistrer'])
                ->getForm();


            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {
                $data = $form->getData();
                $data['confirm_password'] = $data['new_password'];
                $data['cyclos_mode'] = 'cel';

                $responseProfile = $APIToolbox->curlRequest('PATCH', '/members/'.$membre->id.'/', $data);

                if($responseProfile['httpcode'] == 200) {
                    $this->addFlash('success',$translator->trans('Les modifications ont bien été prises en compte'));
                } else {
                    $this->addFlash('danger', $translator->trans("La modification n'a pas pu être effectuée"));
                }
            }

            return $this->render('profil/password.html.twig', ['form' => $form->createView()]);

        } else {
            return new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
        }
    }

    /**
     * @Route("/profil/pin", name="app_profil_pin")
     */
    public function pin(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator)
    {
        $responsePin = $APIToolbox->curlRequest('GET', '/euskokart-pin/');
        if($responsePin['httpcode'] == 200) {

            // If the pin code is already defined
            if($responsePin['data'] == 'ACTIVE'){
                $form = $this->createFormBuilder()
                    ->add('ex_pin', PasswordType::class, ['label' => 'Code précédent', 'constraints' => [
                        new NotBlank(),
                        new Length(['min' => 4, 'max'=> 4]),
                    ]])
                    ->add('pin1', RepeatedType::class, [
                        'first_options'  => ['label' => 'Nouveau code pin (4 chiffres)'],
                        'second_options' => ['label' => 'Confirmer le nouveau code pin'],
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
                    $data['pin2'] = $data['pin1'];

                    $responseProfile = $APIToolbox->curlRequest('POST', '/euskokart-upd-pin/', $data);

                    if($responseProfile['httpcode'] == 200) {
                        $this->addFlash('success',$translator->trans('Les modifications ont bien été prises en compte'));
                    } else {
                        $this->addFlash('danger', $translator->trans("La modification n'a pas pu être effectuée"));
                    }
                }
            } else {
                // If there isn't a PIN code yet, don't ask for the old one
                $form = $this->createFormBuilder()
                    ->add('pin1', RepeatedType::class, [
                        'first_options'  => ['label' => 'Code pin (4 chiffres)'],
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
                    $data['pin2'] = $data['pin1'];

                    $responseProfile = $APIToolbox->curlRequest('POST', '/euskokart-upd-pin/', $data);

                    if($responseProfile['httpcode'] == 200) {
                        $this->addFlash('success',$translator->trans('Les modifications ont bien été prises en compte'));
                    } else {
                        $this->addFlash('danger', $translator->trans("La modification n'a pas pu être effectuée"));
                    }
                }

            }

            return $this->render('profil/pin.html.twig', ['form' => $form->createView()]);

        } else {
            return new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
        }
    }


    /**
     * @Route("/profil/cotisation", name="app_profil_cotisation")
     */
    public function cotisation(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator)
    {
        $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMember['httpcode'] == 200) {

            $membre = $responseMember['data'][0];

            if($membre->array_options->options_prelevement_cotisation_periodicite == 1){
                $defaultData = $membre->array_options->options_prelevement_cotisation_montant * 12;
            } else {
                $defaultData = $membre->array_options->options_prelevement_cotisation_montant;
            }


            dump($membre->array_options->options_prelevement_cotisation_periodicite);
            $form = $this->createFormBuilder()
                ->add('options_prelevement_cotisation_montant', ChoiceType::class, [
                    'label' => 'Montant de la cotisation',
                    'attr' => ['class' => 'chk'],
                    'required' => true,
                    'multiple' => false,
                    'expanded' => true,
                    'choices' => [
                        '1 eusko par mois / 12 eusko par an' => '12',
                        '2 eusko par mois / 24 eusko par an' => '24',
                        '3 eusko par mois / 36 eusko par an' => '36',
                        '5 eusko par an (chômeurs, minima sociaux)' => '5'
                    ],
                    'data' => round($defaultData, 0)
                ])
                ->add('options_prelevement_cotisation_periodicite', ChoiceType::class, [
                    'label' => 'Périodicité du prélèvement',
                    'required' => true,
                    'multiple' => false,
                    'expanded' => true,
                    'choices' => [
                        'Annuel' => '12',
                        'Mensuel (le 15 du mois)' => '1',
                    ],
                    'data' => round($membre->array_options->options_prelevement_cotisation_periodicite, 0)
                ])
                ->add('options_prelevement_auto_cotisation_eusko', CheckboxType::class, [
                    'label' => '* J\'autorise Euskal Moneta à prélever automatiquement ma cotisation sur mon compte Eusko.',
                ])
                ->add('submit', SubmitType::class, ['label' => 'Enregistrer'])
                ->getForm();


            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {
                $data = $form->getData();

                if($data['options_prelevement_cotisation_periodicite'] == 1){
                    //To get the amount per month and not annualy
                    $data['options_prelevement_cotisation_montant'] = $data['options_prelevement_cotisation_montant'] / 12;
                }
                if(!($data['options_prelevement_cotisation_periodicite'] == 1 && $data['options_prelevement_cotisation_montant'] == 5)){
                    $responseProfile = $APIToolbox->curlRequest('PATCH', '/members/'.$membre->id.'/', $data);

                    if($responseProfile['httpcode'] == 200) {
                        $this->addFlash('success',$translator->trans('Les modifications ont bien été prises en compte'));
                    } else {
                        $this->addFlash('danger', $translator->trans("La modification n'a pas pu être effectuée"));
                    }
                }
            }

            return $this->render('profil/cotisation.html.twig', ['form' => $form->createView(), 'membre' => $membre]);

        } else {
            return new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
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

            $questions = ['' => '','autre' => 'autre'];
            $response = $APIToolbox->curlWithoutToken('GET', '/predefined-security-questions/?language='.$request->getSession()->get('_locale'));

            if($response['httpcode'] == 200){

                foreach ($response['data'] as $question){
                    $questions[$question->question]=$question->question;
                }

                $form = $this->createFormBuilder()
                    ->add('questionSecrete', ChoiceType::class, [
                        'label' => 'Votre question secrète',
                        'required' => true,
                        'choices' => $questions
                    ])
                    ->add('questionPerso', TextType::class, ['label' => 'Votre question personnalisée', 'required' => false])
                    ->add('reponse', TextType::class, [
                        'label' => 'Reponse',
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
                    } else {
                        $this->addFlash('danger', $translator->trans("La modification n'a pas pu être effectuée"));
                    }
                }

                return $this->render('profil/question.html.twig', ['form' => $form->createView()]);
            }
        }
        return new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");

    }

    /**
     * @Route("/ajax/zipcode/search", name="app_ajex_zipcode_search")
     */
    public function jsonBeneficiaire(Request $request, APIToolbox $APIToolbox)
    {
        $response = $APIToolbox->curlRequest('GET', '/towns/?zipcode='.$request->get('q'));
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
                $tabCountries[$country->label] = $country->id;
            }

            $builder = $this->createFormBuilder()
                ->add('birth', DateType::class, [
                    'widget' => 'single_text',
                    'required' => true,
                    'data' => (new \DateTime())->setTimestamp($membre->birth)
                ])
                ->add('address', TextareaType::class, ['required' => true, 'data' => $membre->address])
                ->add('zip', TextType::class, ['required' => true, 'data' => $membre->zip, 'attr' => ['class' => 'basicAutoComplete']])
                ->add('town', TextType::class, ['required' => true, 'data' => $membre->town])
                ->add('country_id', ChoiceType::class, ['required' => true, 'choices' => $tabCountries, 'data' => $membre->country_id])
                ->add('phone_mobile', TextType::class, ['required' => true, 'data' => $membre->phone_mobile])
                ->add('email', TextType::class, ['required' => true, 'data' => $membre->email])
                ->add('submit', SubmitType::class, ['label' => 'Enregistrer']);
            $form= $builder->getForm();

            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {
                $data = $form->getData();
                $data['birth'] = $data['birth']->format('d/m/Y');
                $responseLang = $APIToolbox->curlRequest('PATCH', '/members/'.$membre->id.'/', $data);


                dump(json_encode($data));

                if($responseLang['httpcode'] == 200) {
                    $this->addFlash('success',$translator->trans('Les modifications ont bien été prises en compte'));
                } else {
                    $this->addFlash('danger', $translator->trans("La modification n'a pas pu être effectuée"));
                }
            }

            return $this->render('profil/coordonnees.html.twig', ['form' => $form->createView()]);

        } else {
            return new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
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
                    return $this->redirectToRoute('app_profil_langue');
                } else {
                    $this->addFlash('danger', $translator->trans('Le changement de langue n\'a pas pu être effectué', [], null, $data['langue']));
                }
            }

            return $this->render('profil/langue.html.twig', ['form' => $form->createView()]);

        } else {
            return new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
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
                        'label' => 'Recevoir les actualités liées à l\'Eusko',
                        'help' => 'Vous recevrez un à deux mails par semaine.',
                        'choices' => ['Oui' =>'1', 'Non' => '0'],
                        'data' => $booleanNewsletter
                    ])
                ->add('submit', SubmitType::class, ['label' => 'Enregistrer'])
                ->getForm();

            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {
                $data = $form->getData();
                $responseLang = $APIToolbox->curlRequest('PATCH', '/members/'.$membre->id.'/', ['options_recevoir_actus' => $data['news']]);

                if($responseLang['httpcode'] == 200) {
                    $this->addFlash('success',$translator->trans('Les modifications ont bien été prises en compte'));
                } else {
                    $this->addFlash('danger', $translator->trans("La modification n'a pas pu être effectuée"));
                }
            }

            return $this->render('profil/newsletter.html.twig', ['form' => $form->createView()]);

        } else {
            return new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
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
            $booleanNewsletter = $membre->array_options->options_recevoir_actus;

            $form = $this->createFormBuilder()
                ->add('virement_recu', ChoiceType::class,
                    [
                        'label' => 'Virement reçu',
                        'help' => 'Vous recevrez un email pour chaque virement reçu.',
                        'choices' => ['Oui' =>'1', 'Non' => '0'],
                        'data' => $booleanNewsletter
                    ])
                ->add('prelevement_recu', ChoiceType::class,
                    [
                        'label' => 'Prélèvement effectué sur votre compte',
                        'help' => 'Vous recevrez un email pour chaque prélèvement effectué sur votre compte.',
                        'choices' => ['Oui' =>'1', 'Non' => '0'],
                        'data' => $booleanNewsletter
                    ])
                ->add('submit', SubmitType::class, ['label' => 'Enregistrer'])
                ->getForm();

            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {
                $data = $form->getData();
                $responseLang = $APIToolbox->curlRequest('PATCH', '/members/'.$membre->id.'/', ['options_recevoir_actus' => $data['news']]);

                if($responseLang['httpcode'] == 200) {
                    $this->addFlash('success',$translator->trans('Les modifications ont bien été prises en compte'));
                } else {
                    $this->addFlash('danger', $translator->trans("La modification n'a pas pu être effectuée"));
                }
            }

            return $this->render('profil/notifications.html.twig', ['form' => $form->createView()]);

        } else {
            return new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
        }
    }


}
