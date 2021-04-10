<?php

namespace App\Controller;

use App\Form\VirementType;
use App\Security\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Validator\Constraints\File as FileConstraint;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Contracts\Translation\TranslatorInterface;

class VirementController extends AbstractController
{

    /**
     * @Route("/confirm-virement", name="app_virement_confirm")
     */
    public function confirmAction(Request $request,
                                  APIToolbox $APIToolbox,
                                  TranslatorInterface $translator,
                                  SessionInterface $session)
    {
        $data = $session->get('virementData');
        $dataSuccess = $data;
        if(empty($data)){
            $this->addFlash('danger', $translator->trans("Le virement n'a pas pu être effectué"));
            return $this->redirectToRoute('app_virement');
        }
        if($request->isMethod('post')){
            if($session->get('virementBool')){
                unset($data['account_name']);

                //prevent multiple form submit
                $session->set('virementData', []);
                $session->set('virementBool', false);

                //API CALL
                $responseVirement = $APIToolbox->curlRequest('POST', '/execute-virements/', [$data]);
                if($responseVirement['httpcode'] == 200) {

                    $resultats = $responseVirement['data'];
                    foreach($resultats as $resultat){
                        if($resultat->status == 1){
                            return $this->render('virement/success_action.html.twig', ['data' => $dataSuccess]);
                        } else {
                            $this->addFlash('danger',$translator->trans($resultat->message));
                        }
                    }
                } else {
                    $this->addFlash('danger', $translator->trans("Le virement n'a pas pu être effectué"));
                }
                return $this->redirectToRoute('app_virement');
            }
        }

        return $this->render('virement/confirm_action.html.twig', ['data' => $data]);
    }

    /**
     * @Route("/virement", name="app_virement")
     */
    public function virement(Request $request, APIToolbox $APIToolbox, SessionInterface $session)
    {
        //GET beneficiaires
        $response = $APIToolbox->curlRequest('GET', '/beneficiaires/');
        if($response['httpcode'] == 200){
            $beneficiaires = $response['data']->results;

            //Sort by alpha order, will be fixed in API ? #18
            usort($beneficiaires, function($a, $b) {
                return strcmp($a->cyclos_name, $b->cyclos_name);
            });
        }

        //Form generation
        $form = $this->createForm(VirementType::class, null,  []);

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            //prepare payload
            $data = $form->getData();
            $data['account'] = explode('_', $request->get('destinataire'))[0];
            $data['account_name'] = explode('_', $request->get('destinataire'))[1];

            $session->set('virementData', $data);
            $session->set('virementBool', true);

            return $this->redirectToRoute('app_virement_confirm');
        }
        return $this->render('virement/virement.html.twig', ['form' => $form->createView(),'beneficiaires' => $beneficiaires]);
    }

    /**
     * @Route("/virement-multiple", name="app_virement_multiple")
     */
    public function virementMultiple(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator, PrelevementController $prelevementController)
    {
        //Create form with acount number
        $form = $this->createFormBuilder()
            ->add('tableur', FileType::class, [
                'label' => 'Importer un tableur (fichier .xlsx / .xls / .ods)',
                'mapped' => false,
                'required' => false,
                'constraints' => [
                    new FileConstraint([
                        'maxSize' => '2024k',
                    ])
                ],
            ])
            ->add('submit', SubmitType::class, ['label' => 'Valider'])
            ->getForm();

        if($request->isMethod('POST')){
            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {

                $rows = [];
                $comptes = [];
                $listSuccess = '';
                $listFail = '';
                $msg= '';

                //Si on charge un tableur, on supprime la première ligne
                $file = $form['tableur']->getData();

                if(!empty($file)) {
                    $rows = $prelevementController->spreadsheetToArray($file);
                    //extract and validate column names and length
                    $msg = $prelevementController->validateFirstRow(array_slice($rows, 0, 1)[0], 'moneyType');
                    if($msg != ''){
                        $this->addFlash('danger', $msg);
                        //init rows to cancel proccessing
                        $rows = [];
                    } else {
                        //on supprime la première ligne du tableau
                        $rows = array_slice($rows, 1);
                    }
                }

                if(count($rows) > 0){
                    foreach ($rows as $row) {
                        if((float)$row[2] > 0) {
                            $comptes[] = [
                                'account' => str_replace(' ', '', $row[1]),
                                'amount' => (float)$row[2],
                                'description' => $row[3],
                            ];
                        } elseif($row[1] != ''){
                            $listFail .= '<li>'.$row[1].' : Montant incorrect </li>';
                        }
                    }
                } elseif($msg == '') {
                    $this->addFlash('danger', $translator->trans("Format de fichier non reconnu ou tableur vide"));
                }

                $responseVirement = $APIToolbox->curlRequest('POST', '/execute-virements/', $comptes);

                if($responseVirement['httpcode'] == 200) {
                    $resultats = $responseVirement['data'];

                    foreach($resultats as $resultat){
                        if($resultat->status == 1){
                            $listSuccess .= '<li>'.$resultat->name.'</li>';
                        } else {
                            $listFail .= '<li>'.$resultat->account.' : '.$resultat->message.'</li>';
                        }
                    }

                } else {
                    $this->addFlash('danger', $translator->trans("Erreur dans votre fichier, vérifiez que toutes les cellules sont remplies"));
                }

                //Préparation du feedback pour l'utilisateur
                if($listSuccess != ''){
                    $this->addFlash('success',$translator->trans("Virement effectué").'<ul>'.$listSuccess.'</ul> ');
                }
                if($listFail != '') {
                    $this->addFlash('danger', $translator->trans("Erreur de virement : ") .'<ul>'. $listFail . '</ul> ');
                }
            }
        }

        return $this->render('virement/virement_ajout.html.twig', ['form' => $form->createView()]);

    }

    /**
     * @Route("/beneficiaire/gestion", name="app_beneficiaire_gestion")
     */
    public function gestionBeneficiaires(APIToolbox $APIToolbox)
    {
        $response = $APIToolbox->curlRequest('GET', '/beneficiaires/');

        if($response['httpcode'] == 200){

            $beneficiaires = $response['data']->results;
            //Sort by alpha order, will be fixed in API ? #18
            usort($beneficiaires, function($a, $b) {
                return strcmp($a->cyclos_name, $b->cyclos_name);
            });
            return $this->render('main/gestionBeneficiaire.html.twig', ['beneficiaires' => $beneficiaires]);
        } else {
            throw new NotFoundHttpException("La liste des bénéficiaires n'a pas pu être retrouvée.");
        }
    }

    /**
     * @Route("/beneficiaire/ajout", name="app_beneficiaire_ajout")
     */
    public function ajoutBeneficiaires(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator, PrelevementController $prelevementController)
    {

        //Create form with acount number
        $form = $this->createFormBuilder()
            ->add('numero_compte_debiteur', TextType::class, [
                    'required' => false,
                    'constraints' => [
                        new Length(['min' => 9, 'max'=> 9]),
                    ],
                    'label' => "Rentrer un numéro de compte (9 chiffres)"
                ]
            )
            ->add('tableur', FileType::class, [
                'label' => 'Ou importer un tableur (fichier .xlsx / .xls / .ods)',
                'mapped' => false,
                'required' => false,
                'constraints' => [
                    new FileConstraint([
                        'maxSize' => '2024k',
                    ])
                ],
            ])
            ->add('submit', SubmitType::class, ['label' => 'Valider'])
            ->getForm();

        if($request->isMethod('POST')){

            $rows = [];
            $comptes = [];
            $listSuccess = '';
            $listFail = '';
            $msg = '';

            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {

                //Si on ne rentre qu'un seul numéro de compte
                if($form['numero_compte_debiteur']->getData() != null){
                    $comptes = [['cyclos_account_number' => $form['numero_compte_debiteur']->getData()]];
                } else {
                    $file = $form['tableur']->getData();
                    if(!empty($file)) {
                        $rows = $prelevementController->spreadsheetToArray($file);
                        //extract and validate column names and length
                        $msg = $prelevementController->validateFirstRow(array_slice($rows, 0, 1)[0], 'personType');
                        if($msg != ''){
                            $this->addFlash('danger', $msg);
                            //init rows to cancel proccessing
                            $rows = [];
                        } else {
                            //on supprime la première ligne du tableau
                            $rows = array_slice($rows, 1);
                        }
                    }
                    if(count($rows) > 0){
                        foreach ($rows as $row) {
                            $comptes[] = ['cyclos_account_number' => str_replace(' ', '', $row[1])];
                        }
                    } elseif($msg == '') {
                        $this->addFlash('danger', $translator->trans("Format de fichier non reconnu ou tableur vide"));
                    }
                }

                foreach ($comptes as $data){
                    $responseBenef = $APIToolbox->curlRequest('POST', '/beneficiaires/', $data);
                    if($responseBenef['httpcode'] == 200) {
                        $listSuccess .= '<li>'.$responseBenef['data']->cyclos_name.' ('.$translator->trans("existait déjà").')</li>';
                    } elseif ($responseBenef['httpcode'] == 201) {
                        $listSuccess .= '<li>'.$responseBenef['data']->cyclos_name.'</li>';
                    } elseif ($responseBenef['httpcode'] == 422) {
                        $listFail .= '<li> '.$data['cyclos_account_number'].' '.$translator->trans("numéro de compte non trouvé").'</li>';
                    } else {
                        $listFail .= '<li> '.$data['cyclos_account_number'].' '.$translator->trans("numéro de compte en erreur").'</li>';
                    }
                }
                //Préparation du feedback pour l'utilisateur
                if($listSuccess != ''){
                    $this->addFlash('success',$translator->trans("Bénéficiaire ajouté").'<ul>'.$listSuccess.'</ul> ');
                }
                if($listFail != '') {
                    $this->addFlash('danger', $translator->trans("Erreur lors de l'ajout de bénéficaire") .'<ul>'. $listFail . '</ul> ');
                }

                if($form['numero_compte_debiteur']->getData() != null and $listSuccess !=''){
                    return $this->redirectToRoute('app_beneficiaire_ajout');
                }
            }
        }

        return $this->render('virement/beneficiaire_ajout.html.twig', ['form' => $form->createView()]);

    }

    /**
     * @Route("/beneficiaire/remove/{id}", name="app_beneficiaire_remove")
     */
    public function removeBeneficiaires($id, Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator)
    {
        $response = $APIToolbox->curlRequest('DELETE', '/beneficiaires/'.$id.'/');
        if($response['httpcode'] == 200 || $response['httpcode'] == 204) {
            $this->addFlash('success', $translator->trans("Bénéficiaire supprimé"));
        } else {
            $this->addFlash('danger', $translator->trans("Erreur lors de la suppression"));
        }
        return $this->redirectToRoute('app_beneficiaire_gestion');
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
