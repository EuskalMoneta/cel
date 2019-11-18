<?php

namespace App\Controller;

use App\Security\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Contracts\Translation\TranslatorInterface;

class VirementController extends AbstractController
{

    /**
     * @Route("/virement", name="app_virement")
     */
    public function virement(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator)
    {
        //GET beneficiaires
        $response = $APIToolbox->curlRequest('GET', '/beneficiaires/');
        if($response['httpcode'] == 200){
            $beneficiaires = $response['data']->results;
        }

        //Form generation
        $destinataire ='';
        $form = $this->createFormBuilder(null, ['attr' => ['id' => 'form-virement']])
            ->add('amount', NumberType::class, ['required' => true, 'label' => "Montant"])
            ->add('guard_check', HiddenType::class, ['required' => false])
            ->add('description', TextType::class, ['required' => true, 'label' => "libellé de l'opération"])
            ->add('submit', SubmitType::class, ['label' => 'Valider'])
            ->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {

            //prepare payload
            $data = $form->getData();
            $data['beneficiaire'] = $request->get('destinataire');

            //check if the guard has been submitted, prevent double submit bug
            if($data['guard_check'] == 'ok'){
                unset($data['guard_check']);
                //API CALL
                $responseVirement = $APIToolbox->curlRequest('POST', '/one-time-transfer/', $data);
                if($responseVirement['httpcode'] == 200) {
                    $this->addFlash('success',$translator->trans('Virement effectué'));
                    return $this->redirectToRoute('app_virement');
                } else {
                    $this->addFlash('danger', $translator->trans("Le virement n'a pas pu être effectué"));
                }
            }



        }

        return $this->render('main/virement.html.twig', ['form' => $form->createView(), 'destinataire' => $destinataire, 'beneficiaires' => $beneficiaires]);
    }

    /**
     * @Route("/beneficiaire/gestion", name="app_beneficiaire_gestion")
     */
    public function gestionBeneficiaires(APIToolbox $APIToolbox)
    {
        $response = $APIToolbox->curlRequest('GET', '/beneficiaires/');

        if($response['httpcode'] == 200){
            return $this->render('main/gestionBeneficiaire.html.twig', ['beneficiaires' => $response['data']->results]);
        } else {
            throw new NotFoundHttpException("La liste des bénéficiaires n'a pas pu être retrouvée.");
        }
    }

    /**
     * @Route("/beneficiaire/ajout", name="app_beneficiaire_ajout")
     */
    public function ajoutBeneficiaires(Request $request, APIToolbox $APIToolbox)
    {

        $response = $APIToolbox->curlRequest('GET', '/beneficiaires/');

        if($response['httpcode'] == 200){

            if($request->isMethod('POST')){
                $params = explode('!', $request->get('recherche'));
                $APIToolbox->curlRequest('POST', '/beneficiaires/', ['cyclos_id' => $params[0], 'cyclos_account_number' => $params[1], 'cyclos_name' => $params[2], 'owner' => $this->getUser()->getUsername()]);

                $this->addFlash('success', 'Bénéficiaire ajouté');
                return $this->redirectToRoute('app_beneficiaire_gestion');
            }

            return $this->render('main/ajoutBeneficiaire.html.twig', ['beneficiaires' => $response['data']->results]);
        } else {
            throw new NotFoundHttpException("La liste des bénéficiaires n'a pas pu être retrouvée.");
        }
    }

    /**
     * @Route("/beneficiaire/remove/{id}", name="app_beneficiaire_remove")
     */
    public function removeBeneficiaires($id, Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator)
    {
        $response = $APIToolbox->curlRequest('GET', '/beneficiaires/'.$id.'/');
        if($response['httpcode'] == 200){

            if($request->isMethod('POST')){
                $APIToolbox->curlRequest('DELETE', '/beneficiaires/'.$id.'/');
                if($response['httpcode'] == 200) {
                    $this->addFlash('success', $translator->trans('Bénéficiaire supprimé'));
                    return $this->redirectToRoute('app_beneficiaire_gestion');
                } else {
                    $this->addFlash('danger', $translator->trans('Erreur lors de la suppression'));
                }
            }

            return $this->render('main/removeBeneficiaire.html.twig', ['beneficiaire' => $response['data']]);
        } else {
            throw new NotFoundHttpException("La liste des bénéficiaires n'a pas pu être retrouvée.");
        }
    }


    /**
     * @Route("/ajax/beneficiaire/search", name="app_beneficiaire_search")
     */
    public function jsonBeneficiaire(Request $request, APIToolbox $APIToolbox)
    {
        $response = $APIToolbox->curlRequest('GET', '/beneficiaires/');
        $tabBenef = [];

        if($response['httpcode'] == 200){
            foreach ($response['data']->results as $benef){
                $tabBenef[] = ['value' => $benef->cyclos_id, 'text'=> $benef->cyclos_name];
            }
            return new JsonResponse($tabBenef);
        } else {
            throw new NotFoundHttpException("Methode non disponible ou erreur RQ");
        }

    }

    /**
     * @Route("/ajax/ajout/beneficiaire/search", name="app_beneficiaire_ajout_search")
     */
    public function jsonBeneficiaireAjout(Request $request, APIToolbox $APIToolbox)
    {
        $response = $APIToolbox->curlRequest('GET', '/beneficiaires/search/?number='.str_replace(' ', '', $request->get('q')));

        if($response['httpcode'] == 200 && $request->isXmlHttpRequest()){
            return new JsonResponse([['value' => $response['data']->id.'!'.$request->get('q').'!'.$response['data']->label, 'text' => $response['data']->label]]);
        } else {
            throw new NotFoundHttpException("Methode non disponible ou erreur RQ");
        }
    }

}
