<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
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

            $session->start();
            $session->set('utilisateur', $data);
            $session->set('compteur', 1);
            /*$response = $APIToolbox->curlWithoutToken('POST', '/first-connection/', ['login' => $data['adherent'], 'email' => $data['email'], 'language' => $request->getLocale()]);
            if($response['httpcode'] == 200 && $response['data']->member == 'OK'){
                $this->addFlash('success', 'Veuillez vérifier vos emails. Vous allez recevoir un message qui vous donnera accès à un formulaire où vous pourrez choisir votre mot de passe.');
            } else {
                $this->addFlash('danger', 'Erreur de communication avec le serveur api : '.$response['data']->error);
            }*/

            return $this->redirectToRoute('app_vee_etape2_coordonnees');

        }
        return $this->render('vacancesEusko/etape1_identite.html.twig', ['title' => $translator->trans("Identité"), 'form' => $form->createView()]);
    }

    /**
     * @Route("/vacances-en-eusko/coordonnees", name="app_vee_etape2_coordonnees")
     */
    public function etape2Coordonnees(APIToolbox $APIToolbox, Request $request, SessionInterface $session)
    {

        $session->start();
        dump($session->get('name'));


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

            return $this->redirectToRoute('app_vee_etape3_justificatif');
        }
        return $this->render('vacancesEusko/etape2_coordonnees.html.twig', ['title' => "Coordonnées", 'form' => $form->createView()]);
    }

    /**
     * @Route("/vacances-en-eusko/justificatif", name="app_vee_etape3_justificatif")
     */
    public function etape3justificatif(APIToolbox $APIToolbox, Request $request, SessionInterface $session)
    {
        return $this->render('vacancesEusko/etape3_erreur.html.twig');
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

            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {

            }
            return $this->render('vacancesEusko/etape3_justificatif.html.twig', ['title' => "Justificatif", 'form' => $form->createView()]);
        }
        return $this->render('vacancesEusko/etape3_erreur.html.twig');
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
            if($checkID['httpcode'] == 400){
                $this->addFlash('danger', $translator->trans("Le document n'est pas valide ou le fichier est trop lourd (maximum 4Mo)"));
            } elseif ($checkID['httpcode'] == 200){
                $status = true;
                $dataCard = json_decode($checkID["data"]);

                $naissance = $dataCard->holderDetail->birthDate;
                $data['birth'] = $naissance->day.'/'.$naissance->month.'/'.$naissance->year;
                //todo API eusko upload image and profile

                dump($dataCard);
                $response = $APIToolbox->go_nogo($checkID["data"]);

                dump($response);
            }

        } else {
            $this->addFlash('danger', 'Erreur fichier non reconnu');
        }

        return new JsonResponse(['bool' => $status, 'resultat' => $response]);

    }


}
