<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;


class AssoController extends AbstractController
{
    /**
     * @Route("/asso", name="app_asso")
     */
    public function index(APIToolbox $APIToolbox)
    {

        $response = $APIToolbox->curlRequest('GET', '/account-summary-adherents/');
        if($response['httpcode'] == 200) {
            $infosUser = [
                'compte' => $response['data']->result[0]->number,
                'nom' => $response['data']->result[0]->owner->display,
                'solde' => $response['data']->result[0]->status->balance
            ];

            $responseMember = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());

            return $this->render('profil/profil.html.twig', ['infosUser' => $infosUser, 'membre' => $responseMember['data'][0]]);
        } else {
            throw new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");
        }
    }

}
