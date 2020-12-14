<?php

namespace App\Controller;

use App\Security\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Validator\Constraints\GreaterThanOrEqual;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Contracts\Translation\TranslatorInterface;

class ChangeController extends AbstractController
{
    /**
     * @Route("/change", name="app_change")
     */
    public function change(APIToolbox $APIToolbox)
    {
        $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMember['httpcode'] == 200) {

            $membre = $responseMember['data'][0];

            return $this->render('change/change.html.twig', ['membre' => $membre]);

        }

        throw new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");

    }

    /**
     * @Route("/change/modifier", name="app_change_modifier")
     */
    public function changeModifier(APIToolbox $APIToolbox, Request $request, TranslatorInterface $translator)
    {
        $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMember['httpcode'] == 200) {

            $membre = $responseMember['data'][0];

            $form = $this->createFormBuilder(null, ['attr' => ['id' => 'form-virement']])
                ->add('options_prelevement_change_montant', NumberType::class,
                    [
                        'required' => true,
                        'label' => $translator->trans("Montant"),
                        'constraints' => [
                            new NotBlank(),
                            new GreaterThanOrEqual(['value' => 20]),
                        ],
                    ]
                )
                ->add('prelevement_change_comment', TextType::class, ['required' => false, 'label' => $translator->trans("Commentaire")])
                ->add('submit', SubmitType::class, ['label' => $translator->trans("Valider")])
                ->getForm();

            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {
                $data = $form->getData();
                $data['mode'] = 'modify';
                str_replace(',', ',',$data['options_prelevement_change_montant']);

                $responseChange = $APIToolbox->curlRequest('PATCH', '/members/'.$membre->id.'/', $data);
                if($responseChange['httpcode'] == 200) {
                    $this->addFlash('success',$translator->trans('Votre demande a bien été prise en compte'));
                    return $this->redirectToRoute('app_change');
                } else {
                    $this->addFlash('danger', $translator->trans("Erreur lors de la demande."));
                }

            }
            return $this->render('change/changeModifier.html.twig', ['membre' => $membre, 'form' => $form->createView()]);
        }
        throw new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
    }

}