<?php

namespace App\Controller;

use App\Security\User;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Security\Core\Exception\UsernameNotFoundException;


class APIToolbox extends AbstractController
{

    private $base_url;
    private $url_idcheck;
    private $auth_idcheck;
    private $logger;

    public function __construct(LoggerInterface $logger)
    {
        $this->base_url = $_ENV['API_PUBLIC_URL'];
        $this->url_idcheck = $_ENV['IDCHECK_URL'];
        $this->auth_idcheck = $_ENV['IDCHECK_AUTH'];
        $this->logger = $logger;
    }

    /**
     * Makes a cUrl request
     *
     * @param $method
     * @param $link
     * @param string $data
     * @param string $token
     * @return array|\Symfony\Component\HttpFoundation\RedirectResponse
     */
    public function curlRequest($method, $link,  $data = '', $token ='')
    {
        $user = $this->getUser();

        if($token != '') {

        } elseif ($user) {
            $token = $user->getToken();
        } else {
            return ['data' => 'NO TOKEN', 'httpcode' => 505];
        }

        $curl = curl_init();
        curl_setopt($curl, CURLOPT_URL, $this->base_url.$link);
        curl_setopt($curl, CURLOPT_COOKIESESSION, true);
        curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_CUSTOMREQUEST, $method);

        if($method == 'POST' or $method == 'PUT' or $method == 'PATCH'){
            curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($data));
            curl_setopt($curl, CURLOPT_HTTPHEADER, array(
                    'Content-Type: application/json',
                    'Authorization: Token ' . $token,
                    'Content-Length: ' . strlen(json_encode($data)))
            );
        } else {
            curl_setopt($curl, CURLOPT_HTTPHEADER, array(
                    'Content-Type: application/json',
                    'Authorization: Token ' . $token)
            );
        }

        $return = curl_exec($curl);
        $http_status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        if($http_status == 403){
            $this->logger->emergency('Req a renvoyé'.$http_status);
            //return $this->redirectToRoute('app_logout');
            throw new UsernameNotFoundException('Votre session a expirée, merci de vous re-connecter');
        }
        return ['data' => json_decode($return), 'httpcode' => $http_status];
    }

    public function curlGetPDF($method, $link, $type = 'pdf')
    {
        $user = $this->getUser();

        if($user){
            $token = $user->getToken();

            $curl = curl_init();
            curl_setopt($curl, CURLOPT_URL, $this->base_url.$link);
            curl_setopt($curl, CURLOPT_COOKIESESSION, true);
            curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, false);
            curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($curl, CURLOPT_CUSTOMREQUEST, $method);
            if($type == 'pdf'){
                curl_setopt($curl, CURLOPT_HTTPHEADER, array(
                        'Content-Type: application/pdf',
                        'Authorization: Token ' . $token)
                );
            } elseif($type == 'csv'){
                curl_setopt($curl, CURLOPT_HTTPHEADER, array(
                        'Accept: text/csv',
                        'Authorization: Token ' . $token)
                );
            }


            $return = curl_exec($curl);
            $http_status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            curl_close($curl);

            return ['data' => $return, 'httpcode' => $http_status];
        }
        return ['data' => 'nouser', 'httpcode' => 500];
    }



    /**
     * Makes a cUrl request to get token
     */
    public function curlGetToken($username, $password)
    {

        $lien = $this->base_url.'/api-token-auth/';
        $data_string = json_encode(["username" => $username, "password" => $password]);

        $curl = curl_init();
        curl_setopt($curl, CURLOPT_URL, $lien);
        curl_setopt($curl, CURLOPT_COOKIESESSION, true);
        curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);

        curl_setopt($curl, CURLOPT_CUSTOMREQUEST, "POST");
        curl_setopt($curl, CURLOPT_POSTFIELDS, $data_string);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_HTTPHEADER, array(
                'Content-Type: application/json',
                'Content-Length: ' . strlen($data_string))
        );

        $return = curl_exec($curl);
        $err = curl_error($curl);
        $http_status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        if($http_status != 200){
            return false;
        } else {
            $response = json_decode($return);
            return $response->token;
        }

    }

    public function curlWithoutToken($method, $link, $data = '')
    {
        $curl = curl_init();
        curl_setopt($curl, CURLOPT_URL, $this->base_url.$link);
        curl_setopt($curl, CURLOPT_COOKIESESSION, true);
        curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_CUSTOMREQUEST, $method);

        if($method == 'POST' or $method == 'PUT'){
            curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($data));
            curl_setopt($curl, CURLOPT_HTTPHEADER, array(
                    'Content-Type: application/json',
                    'Content-Length: ' . strlen(json_encode($data)))
            );
        } else {
            curl_setopt($curl, CURLOPT_HTTPHEADER, array(
                    'Content-Type: application/json')
            );
        }

        $return = curl_exec($curl);
        $http_status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        return ['data' => json_decode($return), 'httpcode' => $http_status];

    }


    /**
     * Makes a cUrl request for IDCHECK
     *
     * @param $method
     * @param $link
     * @param string $data
     * @return array
     */
    public function curlRequestIdCheck($method, $link,  $data = '')
    {
        $curl = curl_init();
        curl_setopt($curl, CURLOPT_URL, $this->url_idcheck.$link);
        curl_setopt($curl, CURLOPT_COOKIESESSION, true);
        curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_USERPWD, "$this->auth_idcheck");
        curl_setopt($curl, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
        curl_setopt($curl, CURLOPT_CUSTOMREQUEST, $method);

        if($method == 'POST' or $method == 'PUT' or $method == 'PATCH'){
            curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($data));
            curl_setopt($curl, CURLOPT_HTTPHEADER, array(
                    'content-type: application/json',
                    'Content-Length: ' . strlen(json_encode($data)))
            );
        } else {
            curl_setopt($curl, CURLOPT_HTTPHEADER, array(
                    'content-type: application/json',
                )
            );
        }

        $return = curl_exec($curl);
        $http_status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        return ['data' => $return, 'httpcode' => $http_status];
    }

    public function go_nogo($analysisResult)
    {
        $analysisResult = json_decode($analysisResult);

        if($analysisResult->documentClassification->idType != 'ID'){
            return ['status' => false, 'message' => 'Mauvais document'];
        }
        foreach ($analysisResult->checkReportSummary->check as $check){
            if($check->identifier == 'SUMMARY_ID_IDENTIFIED' and $check->result != 'OK')
                return ['status' => false, 'message' => $check->resultMsg];
            if($check->identifier == 'SUMMARY_ID_IDENTIFIED' and $check->result != 'OK')
                return ['status' => false, 'message' => $check->resultMsg];
            elseif ($check->identifier == 'SUMMARY_ID_FALSIFIED' and $check->result != 'OK')
                return ['status' => false, 'message' => $check->resultMsg];
            elseif ($check->identifier == 'SUMMARY_ID_SPECIMEN' and $check->result != 'OK')
                return ['status' => false, 'message' => $check->resultMsg];
            elseif ($check->identifier == 'SUMMARY_ID_COPY' and $check->result != 'OK')
                return ['status' => false, 'message' => $check->resultMsg];
        }
        return true;
    }

    public function autoLogin($credentials)
    {
        $tokenAPI = $this->curlGetToken($credentials['username'], $credentials['password']);
        $member = null;
        if (strpos($credentials['username'], '@') === false) {
            $responseMember = $this->curlRequest('GET', '/members/?login='.$credentials['username'], '', $tokenAPI);
            if($responseMember['httpcode'] == 200) {
                $member = $responseMember['data'][0];
            }
        } else {
            $responseMember = $this->curlRequest('GET', '/members/?email='.$credentials['username'], '', $tokenAPI);
            if($responseMember['httpcode'] == 200) {
                $member = $responseMember['data'];
            }
        }
        if ($member != null) {
            $user = new User();
            $user->setUsername($member->login);
            $user->setLastLogin(new \DateTime());
            $user->setToken($tokenAPI);

            //User Roles
            if($user->getUsername()[0] == 'E'){
                $user->setRoles(['ROLE_CLIENT']);
            }
            elseif($user->getUsername()[0] == 'Z') {
                $user->setRoles(['ROLE_PARTENAIRE']);
            }
            elseif($user->getUsername()[0] == 'T') {
                $user->setRoles(['ROLE_TOURISTE']);
            }
            if($member->type == 'Régie publique de recettes'){
                $user->setRoles(['ROLE_PARTENAIRE', 'ROLE_REGIE']);
            }
            

            // set locale according to the language chosen by the user
            if($member->array_options->options_langue == 'eu'){
                $user->setLocale($member->array_options->options_langue);
            } else {
                $user->setLocale('fr');
            }
        }

        return $user;

    }


}
