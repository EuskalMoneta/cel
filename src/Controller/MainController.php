<?php

namespace App\Controller;

use App\Security\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Contracts\Translation\TranslatorInterface;

class MainController extends AbstractController
{
    /**
     * @Route("/", name="app_homepage")
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
            /** @var User $user */
            $user = $this->getUser();
            $user->setCompte($response['data']->result[0]->number);

            return $this->render('main/index.html.twig', ['infosUser' => $infosUser]);
        } else {
            return new Response();
        }
    }

    /**
     * @Route("/export/rie", name="app_export_rie")
     */
    public function exportRIE(APIToolbox $APIToolbox)
    {
        $response = $APIToolbox->curlGetPDF('GET', '/export-rie-adherent/?account=284688694');

        if($response['httpcode'] == 200) {
            return new Response($response['data'],200,
                [
                    'Content-Type'        => 'application/pdf',
                    'Content-Disposition' => sprintf('attachment; filename="%s"', 'rie.pdf'),
                ]
            );
        } else {
            throw new NotFoundHttpException('RIE non disponible');
        }
    }

    /**
     * @Route("/recherche", name="app_search")
     */
    public function search(Request $request)
    {
        $operations = [];

        $form = $this->createFormBuilder()
            ->add('periode', ChoiceType::class,
                ['choices' => ['Le mois dernier' =>'1', 'Le mois dernier' => '3'],
                'required' => false
                ]
            )
            ->add('dateDebut', DateType::class, ['widget' => 'single_text', 'required' => false])
            ->add('dateFin', DateType::class, ['widget' => 'single_text', 'required' => false])
            ->add('motscles', TextType::class, ['required' => false])
            ->add('submit', SubmitType::class, ['label' => 'Rechercher'])
            ->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();
            $operations = $data;
        }

        return $this->render('main/search.html.twig', ['form' => $form->createView(), 'operations' => $operations]);
    }

    /**
     * @Route("/virement", name="app_virement")
     */
    public function virement(Request $request)
    {
        $destinataire ='';
        $form = $this->createFormBuilder(null, ['attr' => ['id' => 'form-virement']])
            ->add('montant', NumberType::class, ['required' => true])
            ->add('libelle', TextType::class, ['required' => true, 'label' => "libellé de l'opération"])
            ->add('submit', SubmitType::class, ['label' => 'Valider'])
            ->getForm();

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();
            $destinataire = $request->get('destinataire');
            //dump($data);
        }

        return $this->render('main/virement.html.twig', ['form' => $form->createView(), 'destinataire' => $destinataire]);
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
                $APIToolbox->curlRequest('POST', '/beneficiaires/', ['cyclos_id' => $params[0], 'cyclos_account_number' => $params[1], 'cyclos_name' => $params[2], 'owner' => 'E00098']);
            }

            return $this->render('main/ajoutBeneficiaire.html.twig', ['beneficiaires' => $response['data']->results]);
        } else {
            throw new NotFoundHttpException("La liste des bénéficiaires n'a pas pu être retrouvée.");
        }
    }


    /**
     * @Route("/ajax/beneficiaire/search", name="app_beneficiaire_search")
     */
    public function jsonBeneficiaire(Request $request)
    {
        return new JsonResponse([['value' => 'E00098', 'text' => 'E00098']]);
    }

    /**
     * @Route("/ajax/ajout/beneficiaire/search", name="app_beneficiaire_ajout_search")
     */
    public function jsonBeneficiaireAjout(Request $request, APIToolbox $APIToolbox)
    {
        $response = $APIToolbox->curlRequest('GET', '/beneficiaires/search/?number='.$request->get('q'));

        if($response['httpcode'] == 200 && $request->isXmlHttpRequest()){
            return new JsonResponse([['value' => $response['data']->id.'!'.$request->get('q').'!'.$response['data']->label, 'text' => $response['data']->label]]);
        } else {
            throw new NotFoundHttpException("Methode non disponible");
        }
    }

}
