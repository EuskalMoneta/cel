<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Routing\Annotation\Route;
use WiziYousignClient\WiziSignClient;

class OuvertureCompteController extends AbstractController
{
    /**
     * @Route("/ouverture/compte", name="ouverture_compte")
     */
    public function index()
    {
        $youSignClient = new WiziSignClient('04794964049fddf38ba7bd43daa177ef', 'test');

        $resp = $youSignClient->newProcedure(__DIR__.'/../../public/images/note.pdf');

        dump($resp);
        $members = array(
            array(
                'firstname' => 'Clément',
                'lastname' => 'larrieu',
                'email' => 'contact@glukose.fr',
                'phone' => '0660959143',
                'fileObjects' => array(
                    array(
                        'file' => $youSignClient->getIdfile(),
                        'page' => 1,
                        'position' => "230,499,464,589",
                        'mention' => "Read and approved",
                        "mention2" =>"Signed by John Doe"

                    )
                )


            )
        );

        /**
         * On termine la procedure de création de signature en envoyant la liste des utilisateurs , un titre a la signature, une description à la signature
         */
        $response = $youSignClient->addMembersOnProcedure($members,'encore une nouvelle signature','signature généré par le client php WiziYousignClient');
        $member = json_decode($response);



        return $this->render('ouverture_compte/index.html.twig', [
            'memberToken' => $member->members[0]->id,
            'controller_name' => 'OuvertureCompteController',
        ]);
    }
}
