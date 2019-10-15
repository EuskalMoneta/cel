<?php

namespace App\Controller;

use App\Security\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class MainController extends AbstractController
{
    /**
     * @Route("/", name="app_homepage")
     */
    public function index(APIToolbox $APIToolbox, AuthorizationCheckerInterface $authChecker)
    {
        //Check if CGU are accepted, redirect otherwise
        $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if(! $responseMember['data'][0]->array_options->options_accepte_cgu_eusko_numerique){
            return $this->redirectToRoute('app_accept_cgu');
        }

        //init vars
        $operations = [];
        $montant_don = 0;

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

            // GET account history, debit and credit
            $response = $APIToolbox->curlRequest('GET', '/payments-available-history-adherent/?begin='.$dateStart->format('Y-m-d').'T00:00&end='.$dateEnd->format('Y-m-d').'T23:50');
            if($response['httpcode'] == 200) {
                $operations = $response['data'][0]->result->pageItems;
            }

            //GET montant du don 3%
            $response = $APIToolbox->curlRequest('GET', '/montant-don/');
            if($response['httpcode'] == 200) {
                $montant_don = $response['data']->montant_don;
            }


            return $this->render('main/index.html.twig', ['infosUser' => $infosUser, 'operations' => $operations, 'montant_don' => $montant_don]);

        } else {
            return new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
        }
    }



    /**
     * @Route("/export/rie", name="app_export_rie")
     */
    public function exportRIE(APIToolbox $APIToolbox)
    {
        $response = $APIToolbox->curlGetPDF('GET', '/export-rie-adherent/?account='.$this->getUser()->getCompte());

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
        $response = $APIToolbox->curlGetPDF('GET', '/export-history-adherent/?begin='.$dateS.'&end='.$dateE.'&description=', $type);
        if($response['httpcode'] == 200) {
            if($type == 'pdf'){
                return new Response($response['data'],200,
                    [
                        'Content-Type'        => 'application/pdf',
                        'Content-Disposition' => sprintf('attachment; filename="%s"', 'releve-eusko.pdf'),
                    ]
                );
            } else {
                return new Response($response['data'],200,
                    [
                        'Content-Type'        => 'text/csv',
                        'Content-Disposition' => sprintf('attachment; filename="%s"', 'releve-eusko.csv'),
                    ]
                );
            }
        } else {
            throw new NotFoundHttpException('Relevé non disponible');
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


}
