<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Contracts\Translation\TranslatorInterface;


class VacancesEuskoController extends AbstractController
{

    /**
     * @Route("/vacances-en-eusko", name="app_vee_etape1_identite")
     */
    public function asso(APIToolbox $APIToolbox, Request $request, TranslatorInterface $translator)
    {

    }


}
