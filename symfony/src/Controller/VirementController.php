<?php

namespace App\Controller;

use App\Security\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Validator\Constraints\File as FileConstraint;
use Symfony\Component\Validator\Constraints\Length;
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

            //Sort by alpha order, will be fixed in API ? #18
            usort($beneficiaires, function($a, $b) {
                return strcmp($a->cyclos_name, $b->cyclos_name);
            });
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
            $data['account'] = $request->get('destinataire');

            //check if the guard has been submitted, prevent double submit bug
            if($data['guard_check'] == 'ok'){
                unset($data['guard_check']);
                //API CALL
                $responseVirement = $APIToolbox->curlRequest('POST', '/execute-virements/', [$data]);
                if($responseVirement['httpcode'] == 200) {
                    $this->addFlash('success',$translator->trans('Virement effectué'));
                    return $this->redirectToRoute('app_virement');
                } else {
                    $this->addFlash('danger', $translator->trans("Le virement n'a pas pu être effectué"));
                }
            }
        }
        return $this->render('virement/virement.html.twig', ['form' => $form->createView(), 'destinataire' => $destinataire, 'beneficiaires' => $beneficiaires]);
    }

    /**
     * @Route("/virement-multiple", name="app_virement_multiple")
     */
    public function virementMultiple(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator, PrelevementController $prelevementController)
    {
        //Create form with acount number
        $form = $this->createFormBuilder()
            ->add('tableur', FileType::class, [
                'label' => 'Importer un tableur (Fichier .xlsx / .xls / .ods )',
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

                //Si on charge un tableur, on supprime la première ligne
                $file = $form['tableur']->getData();
                if(!empty($file)) {
                    $rows = $prelevementController->spreadsheetToArray($file);
                    $rows = array_slice($rows, 1);
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
                } else {
                    $this->addFlash('danger', $translator->trans('Format de fichier non reconnu ou tableur vide'));
                }

                $responseVirement = $APIToolbox->curlRequest('POST', '/execute-virements/', $comptes);

                if($responseVirement['httpcode'] == 200) {
                    $resultats = $responseVirement['data'];

                    foreach($resultats as $resultat){
                        if($resultat->status == 1){
                            $listSuccess .= '<li>'.$resultat->name.' : '.$resultat->message.'</li>';
                        } else {
                            $listFail .= '<li>'.$resultat->account.' : '.$resultat->message.'</li>';
                        }
                    }

                } else {
                    $this->addFlash('danger', $translator->trans('Erreur dans votre fichier, vérifiez que toutes les cellules sont remplies'));
                }

                //Préparation du feedback pour l'utilisateur
                if($listSuccess != ''){
                    $this->addFlash('success',$translator->trans('Virement effectué').'<ul>'.$listSuccess.'</ul> ');
                }
                if($listFail != '') {
                    $this->addFlash('danger', $translator->trans('Erreur de virement : ') .'<ul>'. $listFail . '</ul> ');
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
                'label' => 'Ou importer un tableur (Fichier .xlsx / .xls / .ods )',
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

            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {

                //Si on ne rentre qu'un seul numéro de compte
                if($form['numero_compte_debiteur']->getData() != null){
                    $comptes = [['cyclos_account_number' => $form['numero_compte_debiteur']->getData()]];
                } else {
                    $file = $form['tableur']->getData();
                    if(!empty($file)) {
                        $rows = $prelevementController->spreadsheetToArray($file);
                        $rows = array_slice($rows, 1);
                    }
                    if(count($rows) > 0){
                        foreach ($rows as $row) {
                            $comptes[] = ['cyclos_account_number' => str_replace(' ', '', $row[1])];
                        }
                    } else {
                        $this->addFlash('danger', $translator->trans('Format de fichier non reconnu ou tableur vide'));
                    }
                }

                foreach ($comptes as $data){
                    $responseBenef = $APIToolbox->curlRequest('POST', '/beneficiaires/', $data);
                    if($responseBenef['httpcode'] == 200) {
                        $listSuccess .= '<li>'.$responseBenef['data']->cyclos_name.' (existe déjà)</li>';
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
                    $this->addFlash('success',$translator->trans('Bénéficiaire ajouté').'<ul>'.$listSuccess.'</ul> ');
                }
                if($listFail != '') {
                    $this->addFlash('danger', $translator->trans('Erreur lors de l\'ajout de bénéficaire') .'<ul>'. $listFail . '</ul> ');
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
