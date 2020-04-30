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
                        $comptes[] = ['numero_compte_debiteur' => $row[0]];
                    }
                } else {
                    $this->addFlash('danger', $translator->trans('Format de fichier non reconnu ou tableur vide'));
                }

                //todo: mise en conformité avec API
                $responseVirement = $APIToolbox->curlRequest('POST', '/virements/', $comptes);
                if($responseVirement['httpcode'] == 200) {
                    $resultats = $responseVirement['data'];
                    foreach($resultats->succes as $succes){
                        $succes->nom_beneficiaire;
                    }
                    foreach($resultats->echec as $echec){
                        $echec->nom_beneficiaire;
                    }
                }

                //Préparation du feedback pour l'utilisateur
                if($listSuccess != ''){
                    $this->addFlash('success',$translator->trans('Bénéficiaire ajouté').'<ul>'.$listSuccess.'</ul> ');
                }
                if($listFail != '') {
                    $this->addFlash('danger', $translator->trans('Erreur lors de l\'ajout de bénéficaire') .'<ul>'. $listFail . '</ul> ');
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
    public function ajoutBeneficiaires(Request $request, APIToolbox $APIToolbox, TranslatorInterface $translator)
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
                    //todo: remplacer avec les nouveaux paramètres API
                    //$comptes = [['numero_compte_debiteur' => $form['numero_compte_debiteur']->getData()]];
                }

                //Si on charge un fichier csv
                $file = $form['tableur']->getData();

                if(!empty($file)) {
                    $rows = $this->spreadsheetToArray($file);
                    $rows = array_slice($rows, 1);
                }

                if(count($rows) > 0){
                    foreach ($rows as $row) {
                        $comptes[] = ['numero_compte_debiteur' => $row[0]];
                    }
                } else {
                    $this->addFlash('danger', $translator->trans('Format de fichier non reconnu ou tableur vide'));
                }
            }


            /*$responseMandats = $APIToolbox->curlRequest('POST', '/beneficiaires/', $comptes);
            if($responseMandats['httpcode'] == 200) {
                $resultats = $responseMandats['data'];
                foreach($resultats->succes as $succes){
                    $succes->nom_debiteur;
                }
                foreach($resultats->echec as $echec){
                    $echec->numero_compte_debiteur;
                }

                //actuellement renvoi une erreur 500 si le mandat existe déjà
                foreach($resultats->attention as $echec){
                    $echec->statut;
                }
            }*/

            /* ANCIENS PARAMS $APIToolbox->curlRequest('POST', '/beneficiaires/', ['cyclos_id' => $params[0], 'cyclos_account_number' => $params[1], 'cyclos_name' => $params[2], 'owner' => $this->getUser()->getUsername()]);
            $this->addFlash('success', 'Bénéficiaire ajouté');*/

            //On fait appel à l'API pour les mandats et on sauvegarde le résultat dans des listes
            foreach ($comptes as $data){
                //todo: remplacer avec les nouveaux paramètres API
                /*
                $responseMandat = $APIToolbox->curlRequest('POST', '/mandats/', $data);
                if($responseMandat['httpcode'] == 201 || $responseMandat['httpcode'] == 200) {
                    $listSuccess .= '<li>'.$responseMandat['data']->nom_debiteur.'</li>';
                } else {
                    $listFail .= '<li>'.$data['numero_compte_debiteur'].'</li>';
                }*/
            }

            //Préparation du feedback pour l'utilisateur
            if($listSuccess != ''){
                $this->addFlash('success',$translator->trans('Bénéficiaire ajouté').'<ul>'.$listSuccess.'</ul> ');
            }
            if($listFail != '') {
                $this->addFlash('danger', $translator->trans('Erreur lors de l\'ajout de bénéficaire') .'<ul>'. $listFail . '</ul> ');
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
