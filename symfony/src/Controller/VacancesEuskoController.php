<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Contracts\Translation\TranslatorInterface;


class VacancesEuskoController extends AbstractController
{

    /**
     * @Route("/vacances-en-eusko", name="app_vee_etape1_identite")
     */
    public function etape1Identite(APIToolbox $APIToolbox, Request $request)
    {
        $form = $this->createFormBuilder()
            ->add('nom', TextType::class, ['label' => 'Nom', 'required' => true, 'constraints' => [ new NotBlank(),]])
            ->add('prenom', TextType::class, ['label' => 'Prénom', 'required' => true, 'constraints' => [ new NotBlank(),]])
            ->add('email', EmailType::class, ['label' => 'Email', 'required' => true, 'constraints' => [ new NotBlank() ] ])
            ->add('password', PasswordType::class, ['label' => 'Mot de passe', 'required' => true, 'constraints' => [ new NotBlank() ] ])
            ->add('valide', CheckboxType::class, ['label' => " ", 'required' => true])
            ->add('submit', SubmitType::class, ['label' => 'Valider'])
            ->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();

            /*$response = $APIToolbox->curlWithoutToken('POST', '/first-connection/', ['login' => $data['adherent'], 'email' => $data['email'], 'language' => $request->getLocale()]);
            if($response['httpcode'] == 200 && $response['data']->member == 'OK'){
                $this->addFlash('success', 'Veuillez vérifier vos emails. Vous allez recevoir un message qui vous donnera accès à un formulaire où vous pourrez choisir votre mot de passe.');
            } else {
                $this->addFlash('danger', 'Erreur de communication avec le serveur api : '.$response['data']->error);
            }*/

            return $this->redirectToRoute('app_vee_etape2_coordonnees');

        }
        return $this->render('vacancesEusko/etape1_identite.html.twig', ['title' => "Identité", 'form' => $form->createView()]);
    }

    /**
     * @Route("/vacances-en-eusko/coordonnees", name="app_vee_etape2_coordonnees")
     */
    public function etape2Coordonnees(APIToolbox $APIToolbox, Request $request)
    {

        //todo: rendre publique cet appel à l'api
        $responseCountries = $APIToolbox->curlRequest('GET', '/countries/');
        $tabCountries = [];
        foreach ($responseCountries['data'] as $country){
            $tabCountries[$country->label] = $country->id;
        }

        $form = $this->createFormBuilder()
            ->add('address', TextareaType::class, ['required' => true])
            ->add('zip', TextType::class, ['required' => true, 'attr' => ['class' => 'basicAutoComplete']])
            ->add('town', TextType::class, ['required' => true])
            ->add('country_id', ChoiceType::class, ['required' => true, 'choices' => $tabCountries])
            ->add('phone_mobile', TextType::class, ['required' => true])
            ->add('submit', SubmitType::class, ['label' => 'Valider'])
            ->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();

            /*$response = $APIToolbox->curlWithoutToken('POST', '/first-connection/', ['login' => $data['adherent'], 'email' => $data['email'], 'language' => $request->getLocale()]);
            if($response['httpcode'] == 200 && $response['data']->member == 'OK'){
                $this->addFlash('success', 'Veuillez vérifier vos emails. Vous allez recevoir un message qui vous donnera accès à un formulaire où vous pourrez choisir votre mot de passe.');
            } else {
                $this->addFlash('danger', 'Erreur de communication avec le serveur api : '.$response['data']->error);
            }*/

        }
        return $this->render('vacancesEusko/etape2_coordonnees.html.twig', ['title' => "Coordonnées", 'form' => $form->createView()]);
    }


}
