<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Contracts\Translation\TranslatorInterface;


class AssoController extends AbstractController
{

    /**
     * @Route("/asso", name="app_asso")
     */
    public function asso(APIToolbox $APIToolbox, Request $request, TranslatorInterface $translator)
    {
        //Init vars
        $optionsAsso = [];

        //GET member for default options
        $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMember['httpcode'] == 200) {
            $membre = $responseMember['data'][0];

            //Get asso list for select
            $response = $APIToolbox->curlRequest('GET', '/associations/');
            if($response['httpcode'] == 200) {
                $optionsAsso = $response['data'];
            }

            if($request->isMethod('POST')){
                $data['fk_asso2'] = '';

                //If asso existante
                if($request->get('radiostar')[0] == 'asso'){
                    $data['fk_asso'] = $request->get('fk_asso');
                    $data['options_asso_saisie_libre'] = '';
                } else {
                    $data['fk_asso'] = '';
                    $data['options_asso_saisie_libre'] = $request->get('options_asso_saisie_libre');
                }

                $response = $APIToolbox->curlRequest('PATCH', '/members/'.$membre->id.'/', $data);
                if($response['httpcode'] == 200) {
                    return $this->redirectToRoute('app_asso_second');
                }
            }

            return $this->render('asso/asso.html.twig', ['optionsAsso' => $optionsAsso, 'membre' => $membre]);
        } else {
            throw new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
        }
    }

    /**
     * @Route("/asso/modifier", name="app_asso_modifier")
     */
    public function assoModifier(APIToolbox $APIToolbox, Request $request, TranslatorInterface $translator)
    {
        //Init vars
        $optionsAsso = [];

        //GET member for default options
        $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMember['httpcode'] == 200) {
            $membre = $responseMember['data'][0];

            //Get asso list for select
            $response = $APIToolbox->curlRequest('GET', '/associations/');
            if($response['httpcode'] == 200) {
                $optionsAsso = $response['data'];
            }

            if($request->isMethod('POST')){
                $data['fk_asso2'] = '';

                //If asso existante
                if($request->get('radiostar')[0] == 'asso'){
                    $data['fk_asso'] = $request->get('fk_asso');
                    $data['options_asso_saisie_libre'] = '';
                } else {
                    $data['fk_asso'] = '';
                    $data['options_asso_saisie_libre'] = $request->get('options_asso_saisie_libre');
                }

                if($data['fk_asso'] == '' and $data['options_asso_saisie_libre'] =='') {
                    $this->addFlash('danger', $translator->trans('Votre saisie est vide !'));
                    return $this->redirectToRoute('app_asso_modifier');
                }

                $response = $APIToolbox->curlRequest('PATCH', '/members/'.$membre->id.'/', $data);
                if($response['httpcode'] == 200) {
                    return $this->redirectToRoute('app_asso_second');
                }
            }

            return $this->render('asso/assoModifier.html.twig', ['optionsAsso' => $optionsAsso, 'membre' => $membre]);
        } else {
            throw new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
        }
    }



    /**
     * @Route("/asso/second-choix", name="app_asso_second")
     */
    public function assoSecond(APIToolbox $APIToolbox, Request $request, TranslatorInterface $translator)
    {
        //GET member for default options
        $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMember['httpcode'] == 200) {
            $membre = $responseMember['data'][0];
            dump($membre);

            //Get APPROVED asso list
            $response = $APIToolbox->curlRequest('GET', '/associations/?approved=yes');
            if($response['httpcode'] == 200) {
                $optionsAsso = $response['data'];
            }

            //Redirect if chosen asso is aproved
            if($membre->fk_asso != ''){
                foreach ($optionsAsso as $asso ){
                    if($asso->id == $membre->fk_asso){
                        $this->addFlash('success', $translator->trans('Association ajoutée !'));
                        return $this->redirectToRoute('app_asso');
                    }
                }
            }

            if($request->isMethod('POST')){
                $data['fk_asso2'] = $request->get('fk_asso2');

                if($data['fk_asso2'] == ''){
                    $this->addFlash('danger', $translator->trans('Veuillez sélectionner une association dans la liste'));
                } else {
                    $response = $APIToolbox->curlRequest('PATCH', '/members/'.$membre->id.'/', $data);
                    if($response['httpcode'] == 200) {
                        $this->addFlash('success', $translator->trans('Vos associations ont bien été enregistrées.'));
                        return $this->redirectToRoute('app_asso');
                    }
                }
            }

            return $this->render('asso/assoSecondChoix.html.twig', ['optionsAsso' => $optionsAsso, 'membre' => $membre]);
        } else {
            throw new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
        }
    }

}
