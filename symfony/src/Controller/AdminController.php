<?php

namespace App\Controller;

use App\Entity\Statistique;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class AdminController extends AbstractController
{
    /**
     * @Route("/admin/stats", name="admin_stats")
     */
    public function visuStatsAction(EntityManagerInterface $em, Request $request)
    {
        $statRepository = $em->getRepository('App:Statistique');

        $data = ['debut' => new \DateTime(),'fin' => new \DateTime()];
        $form = $this->createFormBuilder($data)
            ->add('debut', DateType::class,[
                'years' => range(date('Y') - 50, date('Y') + 50)
            ])
            ->add('fin',DateType::class, [
                'years' => range(date('Y') + 50, date('Y') - 50)
            ])
            ->add('save', SubmitType::class)
            ->getForm();

        if ($request->isMethod('POST')) {

            $form->handleRequest($request);
            $data = $form->getData();

            /** @var \DateTime $start */
            $start = $data['debut'];
            /** @var \DateTime $end */
            $end = $data['fin'];
            $end->modify('+ 1 day');
            $stringS = $start->format('Y-m-d');
            $stringE = $end->format('Y-m-d');
            
            $results = $statRepository->getExportQueryDateOnly($stringS, $stringE, "connexion");

            $cpt =0;
            $moyenne = 0;
            /** @var Statistique $stat */
            foreach ($results as $stat){
                $cpt ++;
                $moyenne = $moyenne + $stat['count'];
            }

            $moyenne = $moyenne / $cpt;

            return $this->render('admin/visuStats.html.twig', [
                'form' => $form->createView(),
                'data' => $data,
                'moyenne' => $moyenne,
                'userUnique' => $cpt,
                'results' => $results
            ]);


        }
        return $this->render('admin/visuStats.html.twig', array(
            'form' => $form->createView(),
        ));

    }

}
