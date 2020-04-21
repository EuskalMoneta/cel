<?php

namespace App\Controller;

use App\Security\User;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Exception;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\IsGranted;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilder;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\Form\FormFactoryBuilder;
use Symfony\Component\Form\FormFactoryBuilderInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use \Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Validator\Constraints\File as FileConstraint;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Contracts\Translation\TranslatorInterface;

class PrelevementController extends AbstractController
{
    /**
     * Page accueil des prélèvements pour les PROS / prestataires
     * @Route("/prelevements", name="app_prelevement")
     * @IsGranted("ROLE_PARTENAIRE")
     */
    public function prelevement(APIToolbox $APIToolbox, Request $request, TranslatorInterface $translator)
    {
        //init vars
        $comptes = [];
        $listSuccess = [];
        $listFail = [];
        $rows = [];

        //Create form with acount number
        $form = $this->createFormBuilder()
            ->add('tableur', FileType::class, [
                'label' => $translator->trans('Importer un tableur (Fichier CSV)'),
                'mapped' => false,
                'required' => false,
                'constraints' => [
                    new FileConstraint([
                        'maxSize' => '2024k',
                    ])
                ],
            ])
            ->add('submit', SubmitType::class, ['label' => $translator->trans('Valider')])
            ->getForm();

        if($request->isMethod('POST')) {

            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {

                /** @var \Symfony\Component\HttpFoundation\File\File $file */
                $file = $form['tableur']->getData();

                if(!empty($file)) {
                    $rows = $this->spreadsheetToArray($file);
                    //on supprime la première ligne du tableau
                    $rows = array_slice($rows, 1);
                }



                if(count($rows) > 0){
                    foreach ($rows as $row) {
                        if($row[1] != null or $row[2] != null or $row[3] != null){
                            $comptes[] = [
                                'account' => $row[1],
                                'amount' => $row[2],
                                'description' => $row[3]
                            ];
                        }
                    }
                } else {
                    $this->addFlash('danger', $translator->trans('Format de fichier non reconnu ou tableur vide'));
                }

                $responsePrelevements = $APIToolbox->curlRequest('POST', '/execute-prelevements/', $comptes);
                if($responsePrelevements['httpcode'] == 201 || $responsePrelevements['httpcode'] == 200) {
                    $data = $responsePrelevements['data'];
                    foreach ($data as $prelevement){
                        if($prelevement->status){
                            $listSuccess[] = $prelevement;
                        } else {
                            $listFail[] = $prelevement;
                        }
                    }
                } else {
                    $this->addFlash('danger', $translator->trans('Erreur lors de la demande.'));
                }
            }
        }

        return $this->render('prelevement/executionPrelevement.html.twig', ['form' => $form->createView(), 'listSuccess' => $listSuccess, 'listFail' => $listFail]);

    }

    /**
     * @Route("/prelevements/autorisations", name="app_prelevement_autorisation")
     */
    public function autorisations(APIToolbox $APIToolbox)
    {
        //Init vars
        $mandatsEnATT = [];
        $mandatsValide = [];
        $mandatsRev = [];

        //Get Mandats from API
        $responseMandats = $APIToolbox->curlRequest('GET', '/mandats/?type=debiteur');
        if($responseMandats['httpcode'] == 200) {

            $mandats = $responseMandats['data']->results;

            //Sort results in two arrays
            foreach($mandats as $mandat){
                if($mandat->statut == 'ATT'){
                    $mandatsEnATT[] = $mandat;
                } elseif($mandat->statut == 'REV'){
                    $mandatsRev[] = $mandat;
                } elseif($mandat->statut == 'VAL'){
                    $mandatsValide[] = $mandat;
                }
            }

            return $this->render('prelevement/autorisation.html.twig', ['mandatsEnATT' => $mandatsEnATT, 'mandatsValide' => $mandatsValide, 'mandatsRev' => $mandatsRev]);

        }
        throw new NotFoundHttpException("Impossible de récupérer les informations de mandats");
    }

    /**
     * @Route("/prelevements/autorisations/{type}/{id}", name="app_prelevement_autorisation_change_state")
     */
    public function autorisationsChangeState($id, $type, APIToolbox $APIToolbox, TranslatorInterface $translator)
    {
        $responseMandat = $APIToolbox->curlRequest('POST', '/mandats/'.$id.'/'.$type.'/');
        if($responseMandat['httpcode'] == 204 ) {
            if($type == 'valider'){
                $this->addFlash('success', $translator->trans('Le mandat a été validé'));
            } elseif($type == 'refuser'){
                $this->addFlash('success', $translator->trans('Le mandat a été refusé'));
            } elseif($type == 'revoquer'){
                $this->addFlash('success', $translator->trans('Le mandat a été révoqué'));
            }
            return $this->redirectToRoute('app_prelevement_autorisation');
        }
        throw new NotFoundHttpException("Opération impossible.");
    }

    /**
     * @Route("/delete/prelevements/{id}", name="app_prelevement_autorisation_delete")
     */
    public function autorisationsDelete($id, APIToolbox $APIToolbox, TranslatorInterface $translator)
    {
        $responseMandat = $APIToolbox->curlRequest('DELETE', '/mandats/'.$id.'/');
        if($responseMandat['httpcode'] == 204 ) {
            $this->addFlash('success', $translator->trans('Le mandat a été supprimé'));
            return $this->redirectToRoute('app_prelevement_mandats');
        }
        throw new NotFoundHttpException("Opération de suppression impossible.");
    }

    /**
     * @Route("/prelevements/mandats", name="app_prelevement_mandats")
     */
    public function mandats(APIToolbox $APIToolbox)
    {
        //Init vars
        $mandatsEnATT = [];
        $mandatsValide = [];
        $mandatsRev = [];
        $mandatsRef = [];

        //Get Mandats from API
        $responseMandats = $APIToolbox->curlRequest('GET', '/mandats/?type=crediteur');
        if($responseMandats['httpcode'] == 200) {

            $mandats = $responseMandats['data']->results;

            //Sort results in two arrays
            foreach($mandats as $mandat){
                if($mandat->statut == 'ATT'){
                    $mandatsEnATT[] = $mandat;
                } elseif($mandat->statut == 'REV'){
                    $mandatsRev[] = $mandat;
                } elseif($mandat->statut == 'REF'){
                    $mandatsRef[] = $mandat;
                } elseif($mandat->statut == 'VAL'){
                    $mandatsValide[] = $mandat;
                }
            }

            return $this->render('prelevement/mandats.html.twig', ['mandatsEnATT' => $mandatsEnATT, 'mandatsValide' => $mandatsValide, 'mandatsRev' => $mandatsRev, 'mandatsRef' => $mandatsRef]);
        }

        throw new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");

    }

    /**
     * @Route("/prelevements/mandats/ajout", name="app_prelevement_mandats_ajout")
     */
    public function ajoutMandat(APIToolbox $APIToolbox, Request $request, TranslatorInterface $translator)
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
                'label' => 'Ou importer un tableur (Fichier XLSX/CSV)',
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

            $comptes = [];
            $listSuccess = '';
            $listFail = '';

            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {

                //Si on ne rentre qu'un seul numéro de compte
                if($form['numero_compte_debiteur']->getData() != null){
                    $comptes = [['numero_compte_debiteur' => $form['numero_compte_debiteur']->getData()]];
                }

                //Si on charge un fichier csv
                $file = $form['tableur']->getData();

                if(!empty($file)) {
                    $rows = $this->spreadsheetToArray($file);
                }

                if(count($rows) > 0){
                    foreach ($rows as $row) {
                        $comptes[] = ['numero_compte_debiteur' => $row[0]];
                    }
                } else {
                    $this->addFlash('danger', $translator->trans('Format de fichier non reconnu ou tableur vide'));
                }
            }


            //On fait appel à l'API pour les mandats et on sauvegarde le résultat dans des listes
            foreach ($comptes as $data){
                $responseMandat = $APIToolbox->curlRequest('POST', '/mandats/', $data);
                if($responseMandat['httpcode'] == 201 || $responseMandat['httpcode'] == 200) {
                    $listSuccess .= '<li>'.$responseMandat['data']->nom_debiteur.'</li>';
                } else {
                    $listFail .= '<li>'.$data['numero_compte_debiteur'].'</li>';
                }
            }

            //Préparation du feedback pour l'utilisateur
            if($listSuccess != ''){
                $this->addFlash('success',$translator->trans('Mandat ajouté').'<ul>'.$listSuccess.'</ul> ');
            }
            if($listFail != '') {
                $this->addFlash('danger', $translator->trans('Erreur lors de l\'ajout du mandat') .'<ul>'. $listFail . '</ul> ');
            }

        }
        return $this->render('prelevement/mandats_ajout.html.twig', ['form' => $form->createView()]);
    }

    /**
     * Helper method to get a readable array from a spreadsheet !
     *
     * @param File $file
     * @return array
     * @throws \PhpOffice\PhpSpreadsheet\Exception
     */
    public function spreadsheetToArray(File $file){

        $rows = [];
        if($file->getMimeType() == 'text/csv' || $file->getMimeType() == 'text/plain'){

            //READ A CSV File
            if (($handle = fopen($file, "r")) !== FALSE) {
                while(($row = fgetcsv($handle)) !== FALSE) {
                    $rows[] = $row;
                }
            }
        } else {

            //READ other formats .xls .xlsx
            try {
                $reader = IOFactory::createReaderForFile($file);
                $reader->setReadDataOnly(true);
                $spreadsheet = $reader->load($file);
                $worksheet = $spreadsheet->getActiveSheet();
                foreach ($worksheet->getRowIterator() AS $row) {
                    $cellIterator = $row->getCellIterator();
                    $cellIterator->setIterateOnlyExistingCells(FALSE); // This loops through all cells,
                    $cells = [];
                    foreach ($cellIterator as $cell) {
                        $cells[] = $cell->getValue();
                    }
                    $rows[] = $cells;
                }
            } catch (Exception $exception){
            };

        }

        return $rows;
    }

}
