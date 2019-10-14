<?php

namespace App\Controller;

use App\Security\User;
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
use Symfony\Component\Validator\Constraints\File;
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
    public function prelevement(APIToolbox $APIToolbox)
    {
        return $this->render('prelevement/prelevement.html.twig');
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
                } else {
                    $mandatsValide[] = $mandat;
                }
            }

            return $this->render('prelevement/autorisation.html.twig', ['mandatsEnATT' => $mandatsEnATT, 'mandatsValide' => $mandatsValide, 'mandatsRev' => $mandatsRev]);

        }
        return new NotFoundHttpException("Impossible de récupérer les informations de mandats");
    }

    /**
     * @Route("/prelevements/autorisations/{type}/{id}", name="app_prelevement_autorisation_change_state")
     */
    public function autorisationsChangeState($id, $type, APIToolbox $APIToolbox)
    {
        $responseMandat = $APIToolbox->curlRequest('POST', '/mandats/'.$id.'/'.$type.'/');

        if($responseMandat['httpcode'] == 204 ) {

        }
        return $this->render('base.html.twig');
    }

    /**
     * @Route("/prelevements/executions", name="app_prelevement_execution")
     */
    public function executions(APIToolbox $APIToolbox)
    {
        $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMember['httpcode'] == 200) {

            $membre = $responseMember['data'][0];

            return $this->render('prelevement/autorisation.html.twig', ['membre' => $membre]);

        }

        return new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");

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
                } else {
                    $mandatsValide[] = $mandat;
                }
            }

            return $this->render('prelevement/mandats.html.twig', ['mandatsEnATT' => $mandatsEnATT, 'mandatsValide' => $mandatsValide, 'mandatsRev' => $mandatsRev]);
        }

        return new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");

    }

    /**
     * @Route("/prelevements/mandats/ajout", name="app_prelevement_mandats_ajout")
     */
    public function ajoutMandat(APIToolbox $APIToolbox, Request $request, TranslatorInterface $translator)
    {
        //Create form with acount number
        $form = $this->createFormBuilder()
            ->add('numero_compte_debiteur', NumberType::class, [
                    'required' => false,
                    'constraints' => [
                        new Length(['min' => 9, 'max'=> 9]),
                    ],
                    'label' => "Rentrer un numéro de compte (9 chiffres)"
                ]
            )
            ->add('tableur', FileType::class, [
                'label' => 'Ou importer un tableur (Fichier CSV)',
                'mapped' => false,
                'required' => false,
                'constraints' => [
                    new File([
                        'maxSize' => '2024k',
                        'mimeTypes' => [
                            'text/csv',
                            'text/plain',
                        ],
                        'mimeTypesMessage' => 'Le fichier n\'est pas au format csv',
                    ])
                ],
            ])
            ->add('submit', SubmitType::class, ['label' => 'Valider'])
            ->getForm();

        if($request->isMethod('POST')){

            $listSuccess = '';
            $listFail = '';

            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {

                $file = $form['tableur']->getData();
                if($form['numero_compte_debiteur']->getData() != null){
                    $comptes = [['numero_compte_debiteur' => (int)$form['numero_compte_debiteur']->getData()]];
                }

                if(!empty($file)) {
                    if (($handle = fopen($file, "r")) !== FALSE) {
                        while(($row = fgetcsv($handle)) !== FALSE) {
                            if(sizeof($row) == 1){
                                $comptes[] = ['numero_compte_debiteur' => (int)$row[0]];
                            }
                        }
                    }

                }
            }


            foreach ($comptes as $data){
                $responseMandat = $APIToolbox->curlRequest('POST', '/mandats/', $data);
                if($responseMandat['httpcode'] == 201 || $responseMandat['httpcode'] == 200) {
                    $listSuccess .= '<li>'.$responseMandat['data']->nom_debiteur.'</li>';
                } else {
                    $listFail .= '<li>'.$data['numero_compte_debiteur'].'</li>';
                }
            }

            if($listSuccess != ''){
                $this->addFlash('success',$translator->trans('Mandat ajouté').'<ul>'.$listSuccess.'</ul> ');
            }
            if($listFail != '') {
                $this->addFlash('danger', $translator->trans('Erreur lors de l\'ajout du mandat') .'<ul>'. $listFail . '</ul> ');
            }


        }
        return $this->render('prelevement/mandats_ajout.html.twig', ['form' => $form->createView()]);
    }

}