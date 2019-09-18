<?php

namespace App\Controller;

use App\Security\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\CountryType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
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

            $responseMembre = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());

            return $this->render('profil/profil.html.twig', ['infosUser' => $infosUser, 'membre' => $responseMembre['data'][0]]);
        } else {
            return new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
        }
    }

    /**
     * @Route("/profil/coordonnees", name="app_profil_coordonnees")
     */
    public function coordonnees(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator)
    {
        $responseMembre = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMembre['httpcode'] == 200) {

            $membre = $responseMembre['data'][0];
            $form = $this->createFormBuilder()
                ->add('birth', DateType::class, [
                    'widget' => 'single_text',
                    'required' => true,
                    'data' => (new \DateTime())->setTimestamp($membre->birth)
                ])
                ->add('address', TextareaType::class, ['required' => true, 'data' => $membre->address])
                ->add('zip', NumberType::class, ['required' => true, 'data' => $membre->zip])
                ->add('town', TextType::class, ['required' => true, 'data' => $membre->town])
                ->add('country_code', CountryType::class, ['required' => true, 'data' => $membre->country_code])
                ->add('phone_mobile', TextType::class, ['required' => true, 'data' => $membre->phone_mobile])
                ->add('email', TextType::class, ['required' => true, 'data' => $membre->email])
                ->add('submit', SubmitType::class, ['label' => 'Enregistrer'])
                ->getForm();

            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {
                $data = $form->getData();
                $data['birth'] = $data['birth']->format('d/m/Y');
                $responseLang = $APIToolbox->curlRequest('PATCH', '/members/939/', $data);


                dump(json_encode($data));

                if($responseLang['httpcode'] == 200) {
                    $this->addFlash('success',$translator->trans('Les modifications ont bien été prises en compte'));
                } else {
                    $this->addFlash('danger', $translator->trans('La modification n\'a pas pu être effectuée'));
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
        $responseMembre = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMembre['httpcode'] == 200) {

            $langue = $responseMembre['data'][0]->array_options->options_langue;

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
                $responseLang = $APIToolbox->curlRequest('PATCH', '/members/939/', ['options_langue' => $data['langue']]);

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
        $responseMembre = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMembre['httpcode'] == 200) {

            $booleanNewsletter = $responseMembre['data'][0]->array_options->options_recevoir_actus;

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
                $responseLang = $APIToolbox->curlRequest('PATCH', '/members/939/', ['options_recevoir_actus' => $data['news']]);

                if($responseLang['httpcode'] == 200) {
                    $this->addFlash('success',$translator->trans('Les modifications ont bien été prises en compte'));
                } else {
                    $this->addFlash('danger', $translator->trans('La modification n\'a pas pu être effectuée'));
                }
            }

            return $this->render('profil/newsletter.html.twig', ['form' => $form->createView()]);

        } else {
            return new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
        }
    }


}
