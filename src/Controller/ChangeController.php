<?php

namespace App\Controller;

use App\Security\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;

class ChangeController extends AbstractController
{
    /**
     * @Route("/change", name="app_change")
     */
    public function index(APIToolbox $APIToolbox)
    {
        $responseMembre = $APIToolbox->curlRequest('GET', '/members/?login='.$this->getUser()->getUsername());
        if($responseMembre['httpcode'] == 200) {

            $membre = $responseMembre['data'][0];

            return $this->render('change/change.html.twig', ['membre' => $membre]);

        }

        return new NotFoundHttpException("Impossible de récupérer les informations de l'adhérent !");

    }

}