<?php

namespace App\Controller;

use App\Security\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

class MainController extends AbstractController
{
    /**
     * @Route("/", name="app_homepage")
     */
    public function index(APIToolbox $APIToolbox, AuthorizationCheckerInterface $authChecker)
    {

        /*$responseIDCheck = $APIToolbox->curlRequestIdCheck('GET', '/rest/v0/sandbox/image/CNI_FR_SPECIMEN_BERTHIER?rawType=BASE64');
        if($responseIDCheck['httpcode'] == 200) {
            $carteId = $responseIDCheck['data'];
            $checkID = $APIToolbox->curlRequestIdCheck('POST', '/rest/v0/task/image?', ['frontImage' => $carteId]);
            dump(json_decode($checkID["data"]));
            dump($APIToolbox->go_nogo($checkID['data']));
        }*/

        //Check if CGU are accepted, redirect otherwise
        $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        $membre = $responseMember['data'][0];
        if(! $membre->array_options->options_accepte_cgu_eusko_numerique){
            return $this->redirectToRoute('app_accept_cgu');
        }

        // check last_subscription_date_end to redirect to costisation
        if((new \DateTime())->setTimestamp($membre->last_subscription_date_end) < new \DateTime("now")
            and $authChecker->isGranted('ROLE_CLIENT'))
        {
            return $this->redirectToRoute('app_profil_cotisation');
        }

        //init vars
        $operations = [];
        $montant_don = 0;
        $boolMandatATT = false;

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

            // GET mandats en attente
            $responseMandats = $APIToolbox->curlRequest('GET', '/mandats/?type=debiteur');
            if($responseMandats['httpcode'] == 200) {
                $mandats = $responseMandats['data']->results;
                foreach ($mandats as $mandat) {
                    if ($mandat->statut == 'ATT') {
                        $boolMandatATT = true;
                    }
                }
            }

            //GET montant du don 3%
            $response = $APIToolbox->curlRequest('GET', '/montant-don/');
            if($response['httpcode'] == 200) {
                $montant_don = $response['data']->montant_don;
            }


            return $this->render('main/index.html.twig', ['infosUser' => $infosUser, 'operations' => $operations, 'montant_don' => $montant_don, 'boolMandatATT' =>$boolMandatATT]);

        } else {
            throw new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
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
     * @Route("/reconvertir/eusko", name="app_reconvertir")
     */
    public function reconvertir(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator)
    {
        $response = $APIToolbox->curlRequest('GET', '/account-summary-adherents/');

        if($response['httpcode'] == 200) {
            $infosUser = [
                'compte' => $response['data']->result[0]->number,
                'nom' => $response['data']->result[0]->owner->display,
                'solde' => $response['data']->result[0]->status->balance
            ];

            //form generation
            $form = $this->createFormBuilder()
                ->add('amount', NumberType::class, ['label' => 'Montant', 'required' => true])
                ->add('description', TextType::class, ['label' => 'Description', 'required' => true])
                ->add('submit', SubmitType::class, ['label' => 'Valider', 'attr' => ['class' => 'btn-success btn']])
                ->getForm();

            //Form process
            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {
                $data = $form->getData();
                //$data['debit'] = $response['data']->result[0]->id;

                $responseReconversion = $APIToolbox->curlRequest('POST', '/reconvert-eusko/', $data);
                if($responseReconversion['httpcode'] == 201 || $responseReconversion['httpcode'] == 200) {
                    $this->addFlash('success', $translator->trans('Reconversion réussie.'));
                } else {
                    $this->addFlash('danger', $translator->trans('Erreur : vérifier le solde de votre compte.'));
                }
            }

            return $this->render('main/reconvertir.html.twig', ['form' => $form->createView(), 'infosUser' => $infosUser]);

        } else {
            throw new NotFoundHttpException('Informations adhérent non disponible');
        }
    }

    /**
     * @Route("/aide", name="app_aide")
     */
    public function aide(Request $request, APIToolbox $APIToolbox)
    {
        return $this->render('main/aide.html.twig');

    }

    /**
     * @Route("/recherche", name="app_search")
     */
    public function search(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator)
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
        $startOfThisYear = (new \DateTime("now"))->modify('first day of January')->format('Y-m-d');
        $endOfThisYear = (new \DateTime("now"))->modify('last day of December')->format('Y-m-d');

        //form generation
        $form = $this->createFormBuilder()
            ->add('periode', ChoiceType::class,
                ['choices' => [
                    //'Les 7 derniers jours' => $now.'#'.$startOfWeek,
                    'Ce mois ci' => $now.'#'.$startOfMonth,
                    'Le mois dernier' => $endOfLastMonth.'#'.$startOfLastMonth,
                    $translator->trans('Cette année') => $endOfThisYear.'#'.$startOfThisYear,],
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
