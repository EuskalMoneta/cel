<?php

namespace App\Controller;

use App\Security\User;
use Knp\Component\Pager\PaginatorInterface;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Exception;
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
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use \Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints\File as FileConstraint;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Contracts\Translation\TranslatorInterface;

class PrelevementController extends AbstractController
{
    /**
     * Page accueil des prélèvements pour les PROS / prestataires
     */
    #[IsGranted('ROLE_PARTENAIRE')]
    #[Route(path: '/prelevements', name: 'app_prelevement')]
    public function prelevement(APIToolbox $APIToolbox, Request $request, TranslatorInterface $translator): \Symfony\Component\HttpFoundation\Response
    {
        //init vars
        $comptes = [];
        $listSuccess = '';
        $listFail = '';
        $rows = [];
        $msg = '';

        //Create form with acount number
        $form = $this->createFormBuilder()
            ->add('tableur', FileType::class, [
                'label' => $translator->trans("Importer un tableur (fichier .xlsx / .xls / .ods)"),
                'mapped' => false,
                'required' => false,
                'constraints' => [
                    new FileConstraint([
                        'maxSize' => '2024k',
                    ])
                ],
            ])
            ->add('submit', SubmitType::class, ['label' => $translator->trans("Valider")])
            ->getForm();

        if($request->isMethod('POST')) {

            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {

                /** @var \Symfony\Component\HttpFoundation\File\File $file */
                $file = $form['tableur']->getData();

                if(!empty($file)) {
                    $rows = $this->spreadsheetToArray($file);
                    //extract and validate column names and length
                    $msg = $this->validateFirstRow(array_slice($rows, 0, 1)[0], 'moneyType');
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

                $responsePrelevements = $APIToolbox->curlRequest('POST', '/execute-prelevements/', $comptes);
                if($responsePrelevements['httpcode'] == 201 || $responsePrelevements['httpcode'] == 200) {
                    $resultats = $responsePrelevements['data'];

                    foreach($resultats as $resultat){
                        if($resultat->status == 1){
                            $listSuccess .= '<li>'.$resultat->name.'</li>';
                        } else {
                            if($resultat->name != ''){
                                $listFail .= '<li>'.$resultat->name.' : '.$resultat->message.'</li>';
                            } else {
                                $listFail .= '<li>'.$resultat->account.' : '.$resultat->message.'</li>';
                            }

                        }
                    }
                } else {
                    $this->addFlash('danger', $translator->trans("Erreur dans votre fichier, vérifiez que toutes les cellules sont remplies"));
                }

                if($listSuccess != ''){
                    $this->addFlash('success',$translator->trans("Prélèvement effectué").'<ul>'.$listSuccess.'</ul> ');
                }
                if($listFail != '') {
                    $this->addFlash('danger', $translator->trans("Erreur de prélèvement : ") .'<ul>'. $listFail . '</ul> ');
                }
            }
        }

        return $this->render('prelevement/executionPrelevement.html.twig', ['form' => $form, 'listSuccess' => $listSuccess, 'listFail' => $listFail]);

    }

    #[Route(path: '/prelevements/autorisations', name: 'app_prelevement_autorisation')]
    public function autorisations(APIToolbox $APIToolbox): \Symfony\Component\HttpFoundation\Response
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

    #[Route(path: '/prelevements/autorisations/{type}/{id}', name: 'app_prelevement_autorisation_change_state')]
    public function autorisationsChangeState($id, $type, APIToolbox $APIToolbox, TranslatorInterface $translator): \Symfony\Component\HttpFoundation\RedirectResponse
    {
        $responseMandat = $APIToolbox->curlRequest('POST', '/mandats/'.$id.'/'.$type.'/');
        if($responseMandat['httpcode'] == 204 ) {
            if($type == 'valider'){
                $this->addFlash('success', $translator->trans("Le mandat a été validé"));
            } elseif($type == 'refuser'){
                $this->addFlash('success', $translator->trans("Le mandat a été refusé"));
            } elseif($type == 'revoquer'){
                $this->addFlash('success', $translator->trans("Le mandat a été révoqué"));
            }
            return $this->redirectToRoute('app_prelevement_autorisation');
        }
        throw new NotFoundHttpException("Opération impossible.");
    }

    #[Route(path: '/delete/prelevements/{id}', name: 'app_prelevement_autorisation_delete')]
    public function autorisationsDelete($id, APIToolbox $APIToolbox, TranslatorInterface $translator): \Symfony\Component\HttpFoundation\RedirectResponse
    {
        $responseMandat = $APIToolbox->curlRequest('DELETE', '/mandats/'.$id.'/');
        if($responseMandat['httpcode'] == 204 ) {
            $this->addFlash('success', $translator->trans("Le mandat a été supprimé"));
            return $this->redirectToRoute('app_prelevement_mandats');
        }
        throw new NotFoundHttpException("Opération de suppression impossible.");
    }

    #[Route(path: '/prelevements/mandats', name: 'app_prelevement_mandats')]
    public function mandats(APIToolbox $APIToolbox, PaginatorInterface $paginator, Request $request): Response
    {
        //Init vars
        $filters = [
            'nom' => $request->query->get('nom'),
            'statut' => $request->query->all('statut'),
            'dateFrom' => $request->query->get('dateFrom'),
            'dateTo' => $request->query->get('dateTo'),
        ];

        $sortField = $request->query->get('sort', 'date');
        $sortDirection = $request->query->get('direction', 'desc');

        //Get Mandats from API
        $mandats = $this->fetchAllMandats($APIToolbox);

        // Apply filters
        $filteredMandats = array_filter($mandats, function($mandat) use ($filters) {
            $matches = true;

            // Filtre Nom
            if (!empty($filters['nom'])) {
                $matches = $matches && stripos($mandat->nom_debiteur, $filters['nom']) !== false;
            }

            // Filtre statut
            if (!empty($filters['statut'])) {
                $matches = $matches && in_array($mandat->statut, $filters['statut']);
            }

            // Filtre dates
            if (!empty($filters['dateFrom'])) {
                $mandatDate = new \DateTime($mandat->date_derniere_modif);
                $fromDate = new \DateTime($filters['dateFrom']);
                $matches = $matches && $mandatDate >= $fromDate;
            }

            if (!empty($filters['dateTo'])) {
                $mandatDate = new \DateTime($mandat->date_derniere_modif);
                $toDate = new \DateTime($filters['dateTo']);
                $matches = $matches && $mandatDate <= $toDate;
            }

            return $matches;
        });

        // Récupérer les différents statut
        $statutOptions = array_unique(array_map(function($mandat) {
            return $mandat->statut;
        }, $mandats));


        // Convertir en array pour le usort
        $mandatsArray = array_values($filteredMandats);

        usort($mandatsArray, function($a, $b) use ($sortField, $sortDirection) {
            $aValue = $sortField === 'date' ? strtotime($a->date_derniere_modif) : strtolower($a->$sortField);
            $bValue = $sortField === 'date' ? strtotime($b->date_derniere_modif) : strtolower($b->$sortField);

            if ($aValue == $bValue) {
                return 0;
            }

            if ($sortDirection === 'asc') {
                return ($aValue > $bValue) ? 1 : -1;
            } else {
                return ($aValue < $bValue) ? 1 : -1;
            }
        });

        //Nombre de résultats
        $countMandats = count($mandatsArray);

        // Pagination
        $pagination = $paginator->paginate(
            $mandatsArray,
            $request->query->getInt('page', 1),
            30, //changer ici le nombre de résultats par page
            [
                'defaultSortFieldName' => 'date',
                'defaultSortDirection' => 'asc',
                'sortFieldAllowList' => ['nom_debiteur', 'date']
            ]
        );

        return $this->render('prelevement/mandats.html.twig', ['pagination' => $pagination, 'filters' => $filters, 'statutOptions' => $statutOptions, 'countMandats' => $countMandats]);

    }

    private function fetchAllMandats($APIToolbox): array
    {
        $allMandats = [];
        $currentPage = 1;
        $hasMorePages = true;

        while ($hasMorePages) {
            try {
                $responseMandats = $APIToolbox->curlRequest('GET', '/mandats/?type=crediteur&page='.$currentPage);

                if ($responseMandats['httpcode'] == 200 && !empty($responseMandats['data']->results)) {
                    $allMandats = array_merge($allMandats, $responseMandats['data']->results);
                    $currentPage++;
                } else {
                    $hasMorePages = false;
                }

            } catch (\Exception $e) {
                $hasMorePages = false;
            }
        }
        return $allMandats;
    }

    #[Route(path: '/prelevements/mandats/ajout', name: 'app_prelevement_mandats_ajout')]
    public function ajoutMandat(APIToolbox $APIToolbox, Request $request, TranslatorInterface $translator)
    {
        //Create form with acount number
        $form = $this->createFormBuilder()
            ->add('numero_compte_debiteur', TextType::class, [
                    'required' => false,
                    'constraints' => [
                        new Length(['min' => 9, 'max'=> 9]),
                    ],
                    'label' => $translator->trans("Rentrer un numéro de compte (9 chiffres)")
                ]
            )
            ->add('tableur', FileType::class, [
                'label' => $translator->trans("Ou importer un tableur (fichier .xlsx / .xls / .ods)"),
                'mapped' => false,
                'required' => false,
                'constraints' => [
                    new FileConstraint([
                        'maxSize' => '2024k',
                    ])
                ],
            ])
            ->add('submit', SubmitType::class, ['label' => $translator->trans("Valider")])
            ->getForm();

        if($request->isMethod('POST')){

            $comptes = [];
            $listSuccess = '';
            $listFail = '';
            $rows = [];
            $msg = '';

            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {

                //Si on ne rentre qu'un seul numéro de compte
                if($form['numero_compte_debiteur']->getData() != null){
                    $comptes = [['numero_compte_debiteur' => $form['numero_compte_debiteur']->getData()]];
                } else {

                    //Si on charge un fichier tableur
                    $file = $form['tableur']->getData();

                    if(!empty($file)) {
                        $rows = $this->spreadsheetToArray($file);
                        //extract and validate column names and length
                        $msg = $this->validateFirstRow(array_slice($rows, 0, 1)[0], 'personType');
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
                            $comptes[] = ['numero_compte_debiteur' => str_replace(' ', '',$row[1])];
                        }
                    } elseif($msg == '') {
                        $this->addFlash('danger', $translator->trans("Format de fichier non reconnu ou tableur vide"));
                    }
                }


                foreach ($comptes as $data){
                    $responseApi = $APIToolbox->curlRequest('POST', '/mandats/', $data);
                    if($responseApi['httpcode'] == 200) {
                        $listSuccess .= '<li>'.$responseApi['data']->nom_debiteur.' ('.$translator->trans("existait déjà").')</li>';
                    } elseif ($responseApi['httpcode'] == 201) {
                        $listSuccess .= '<li>'.$responseApi['data']->nom_debiteur.'</li>';
                    } elseif ($responseApi['httpcode'] == 422) {
                        $listFail .= '<li> '.$data['numero_compte_debiteur'].' '.$translator->trans("numéro de compte non trouvé").'</li>';
                    } else {
                        $listFail .= '<li> '.$data['numero_compte_debiteur'].' '.$translator->trans("numéro de compte en erreur").'</li>';
                    }
                }

                //Préparation du feedback pour l'utilisateur
                if($listSuccess != ''){
                    $this->addFlash('success',$translator->trans("Mandat ajouté").'<ul>'.$listSuccess.'</ul> ');
                }
                if($listFail != '') {
                    $this->addFlash('danger', $translator->trans("Erreur lors de l'ajout :") .'<ul>'. $listFail . '</ul> ');
                }

                if($form['numero_compte_debiteur']->getData() != null and $listSuccess !=''){
                    return $this->redirectToRoute('app_prelevement_mandats_ajout');
                }
            }
        }

        return $this->render('prelevement/mandats_ajout.html.twig', ['form' => $form]);
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
                    $cellIterator->setIterateOnlyExistingCells(TRUE); // This loops through all cells,
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

    /**
     * Helper function to validate columns order and title
     *
     * @param mixed $row
     * @return string
     */
    public function validateFirstRow($row, $type)
    {
        $msg ='';

        if($type == 'moneyType'){
            $colEu = ['Izena', 'Kontu zenbakia', 'Zenbatekoa', 'Eragiketaren deskribapena'];
            $colFr = ['Nom', 'N° de compte', 'Montant', "Libellé de l'opération"];
        } elseif ($type == 'personType'){
            $colEu = ['Izena', 'Kontu zenbakia'];
            $colFr = ['Nom', 'N° de compte'];
        }

        if(count($colFr) != count($row)){
            return "Le fichier envoyé ne contient pas le bon nombre de colonnes, veuillez utiliser le modèle de fichier pour Excel ou pour OpenOffice / LibreOffice.";
        }

        for($i =0; $i < count($colFr); $i++){
            // gestion des différents types d'apostrophe
            $row[$i] = str_replace("’", "'", $row[$i]);
            if(!($row[$i] == $colEu[$i] || $row[$i] == $colFr[$i])){
                $msg = "Le fichier envoyé ne contient pas les bonnes colonnes (les titres de la première ligne ne correspondent pas), veuillez utiliser le modèle de fichier pour Excel ou pour OpenOffice / LibreOffice.";
            }
        }
        return $msg;
    }


}
