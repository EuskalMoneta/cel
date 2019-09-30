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
        $operations = [];

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


            $dateEnd = (new \DateTime("now"));
            $dateStart = (new \DateTime("now"))->modify("-3 month");

            $response = $APIToolbox->curlRequest('GET', '/payments-available-history-adherent/?begin='.$dateStart->format('Y-m-d').'T00:00&end='.$dateEnd->format('Y-m-d').'T23:50');

            if($response['httpcode'] == 200) {
                $operations = $response['data'][0]->result->pageItems;
            }
            return $this->render('main/index.html.twig', ['infosUser' => $infosUser, 'operations' => $operations]);
        } else {
            return new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
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
     * @Route("/export/releve/{type}/{dateS}/{dateE}", name="app_export_releve")
     */
    public function exportReleve( $dateS, $dateE, APIToolbox $APIToolbox, $type = 'pdf')
    {
        $response = $APIToolbox->curlGetPDF('GET', '/export-history-adherent/?begin='.$dateS.'T00:00&end='.$dateE.'T23:59&description=&mode='.$type);
        if($response['httpcode'] == 200) {
            if($type == 'pdf'){
                return new Response($response['data'],200,
                    [
                        'Content-Type'        => 'application/pdf',
                        'Content-Disposition' => sprintf('attachment; filename="%s"', 'releve-eusko.pdf'),
                    ]
                );
            } else {
                dump($response['data']);
                dump(json_decode(str_replace ('\"','"',$response['data']), true));
                dump(substr($response['data'], 2));
                dump(json_decode('{'.substr($response['data'], 2)));
                dump(json_last_error_msg());
                /*dump($this->jsonToCsv($response['data']));*/
                return $this->render('base.html.twig');
                /*return new Response($response['data'],200,
                    [
                        'Content-Type'        => 'text/csv',
                        'Content-Disposition' => sprintf('attachment; filename="%s"', 'releve-eusko.csv'),
                    ]
                );*/
            }
        } else {
            throw new NotFoundHttpException('Releve non disponible');
        }
    }

    /**
     * @Route("/recherche", name="app_search")
     */
    public function search(Request $request, APIToolbox $APIToolbox)
    {
        //Init vars
        $operations = 'empty';
        $dateS = 'empty';
        $dateE = 'empty';

        //Set dates for the periode select
        $now = (new \DateTime("now"))->format('Y-m-d');
        $startOfWeek = (new \DateTime("now"))->modify('-1 week')->format('Y-m-d');
        $startOfMonth = (new \DateTime("now"))->modify('first day of this month')->format('Y-m-d');
        $startOfLastMonth = (new \DateTime("now"))->modify('first day of last month')->format('Y-m-d');
        $endOfLastMonth = (new \DateTime("now"))->modify('last day of last month')->format('Y-m-d');

        //form generation
        $form = $this->createFormBuilder()
            ->add('periode', ChoiceType::class,
                ['choices' => ['Les 7 derniers jours' => $now.'#'.$startOfWeek, 'Ce mois ci' => $now.'#'.$startOfMonth, 'Le mois dernier' => $endOfLastMonth.'#'.$startOfLastMonth],
                    'required' => false
                ]
            )
            ->add('dateDebut', DateType::class, ['widget' => 'single_text', 'required' => true])
            ->add('dateFin', DateType::class, ['widget' => 'single_text', 'required' => true])
            ->add('submit', SubmitType::class, ['label' => 'Valider', 'attr' => ['class' => 'btn-success btn']])
            ->getForm();

        //Form process
        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();

            //store and sent to the view for the export btns
            $dateS = $data['dateDebut']->format('Y-m-d');
            $dateE = $data['dateFin']->format('Y-m-d');

            $response = $APIToolbox->curlRequest('GET', '/payments-available-history-adherent/?begin='.$dateS.'T00:00&end='.$dateE.'T23:59');

            if($response['httpcode'] == 200) {
                $operations = $response['data'][0]->result->pageItems;
            }
        }

        return $this->render('main/search.html.twig', ['form' => $form->createView(), 'operations' => $operations, 'dateS' => $dateS, 'dateE' => $dateE]);
    }

    /**
     * @Route("/virement", name="app_virement")
     */
    public function virement(Request $request, APIToolbox $APIToolbox)
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

                $this->addFlash('success', 'Bénéficiaire ajouté');
                return $this->redirectToRoute('app_beneficiaire_gestion');
            }

            return $this->render('main/ajoutBeneficiaire.html.twig', ['beneficiaires' => $response['data']->results]);
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
                $tabBenef[] = ['value' => $benef->cyclos_account_number, 'text'=> $benef->cyclos_name];
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
        $response = $APIToolbox->curlRequest('GET', '/beneficiaires/search/?number='.$request->get('q'));

        if($response['httpcode'] == 200 && $request->isXmlHttpRequest()){
            return new JsonResponse([['value' => $response['data']->id.'!'.$request->get('q').'!'.$response['data']->label, 'text' => $response['data']->label]]);
        } else {
            throw new NotFoundHttpException("Methode non disponible ou erreur RQ");
        }
    }

}
