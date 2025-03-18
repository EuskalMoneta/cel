<?php

namespace App\Service;

use Symfony\Component\HttpFoundation\Exception\BadRequestException;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

use Psr\Log\LoggerInterface;


class IDCheckAPI
{
    private ?string $accessToken = null;
    private ?array $tokenData = null;

    public function __construct(private readonly HttpClientInterface $httpClient, private readonly TranslatorInterface $translator
                                             ,LoggerInterface $logger
) {}

    public function login(): array
    {
        $response = $this->httpClient->request(
            'POST',
            $_ENV['IDCHECK_AUTHURL'],
            [
                'headers' => [
                    'Content-Type' => 'application/x-www-form-urlencoded',
                ],
                'body' => http_build_query([
                    'grant_type' => $_ENV['IDCHECK_GRANT_TYPE'],
                    'client_id' => $_ENV['IDCHECK_CLIENT_ID'],
                    'client_secret' => $_ENV['IDCHECK_CLIENT_SECRET'],
                    'username' => $_ENV['IDCHECK_AUTH'],
                    'password' => $_ENV['IDCHECK_PASS'],
                    'broker' => $_ENV['IDCHECK_REALM'],
                ]),
            ]
        );

        if ($response->getStatusCode() !== 200) {
            throw new BadRequestException('Authentication failed');
        }

        $this->tokenData = $response->toArray();
        $this->accessToken = $this->tokenData['access_token'];


        return $this->tokenData;
    }

    public function createDocument($recto, $verso): array
    {
        if (!$this->isAuthenticated()) {
            throw new BadRequestException('User not authenticated');
        }

        $documentRequest = [
            'type' => 'ID',
            'images' => [
                [
                    'data' => $recto,
                    "documentPart" => "RECTO",
                    "type" => "DL"
                ],

            ]
        ];

        if ($verso !== null) {
            $documentRequest['images'][] = [
                'data' => $verso,
                "documentPart" => "VERSO",
                "type" => "DL"
            ];
        }

        $response = $this->httpClient->request(
            'POST',
            $_ENV['IDCHECK_ENDPOINT'].'/rest/v1/'.$_ENV['IDCHECK_REALM'].'/document/check',
            [
                'headers' => [
                    'Authorization' => sprintf('Bearer %s', $this->accessToken),
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json'
                ],
                'json' => $documentRequest
            ]
        );

        if ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300) {
            return ['data' => [], 'httpcode' => $response->getStatusCode()];
        }

        return ['data' => $response->toArray(), 'httpcode' => $response->getStatusCode()];
    }

    public function getReport($uidDocument, $uidCheck): array
    {
        if (!$this->isAuthenticated()) {
            throw new BadRequestException('User not authenticated');
        }

        $response = $this->httpClient->request(
            'GET',
            $_ENV['IDCHECK_ENDPOINT'].'/rest/v1/'.$_ENV['IDCHECK_REALM'].'/document/'.$uidDocument.'/report',
            [
                'headers' => [
                    'Authorization' => sprintf('Bearer %s', $this->accessToken),
                    'Accept' => 'application/json',
                ],
            ]
        );

        if ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300) {
            return ['data' => [], 'httpcode' => $response->getStatusCode()];
        }

        return ['data' => $response->getContent(), 'httpcode' => $response->getStatusCode()];
    }

    /**
     * Test API
     */
    public function getUserInfo(): array
    {
        if (!$this->isAuthenticated()) {
            throw new BadRequestException('User not authenticated');
        }

        $response = $this->httpClient->request(
            'GET',
            $_ENV['IDCHECK_ENDPOINT'].'/rest/v1/'.$_ENV['IDCHECK_REALM'].'/auth/userInfo',
            [
                'headers' => [
                    'Authorization' => sprintf('Bearer %s', $this->accessToken),
                    'Accept' => 'application/json',
                ],
            ]
        );

        if ($response->getStatusCode() !== 200) {
            throw new BadRequestException('Failed to fetch user information');
        }

        return $response->toArray();
    }

    public function go_nogo($analysisResult,$logger): array
    {
        $message = '';

        if($analysisResult['type'] !== 'ID' && $analysisResult['type'] !== 'P'){
            return ['status' => false, 'message_erreur' => $this->translator->trans("Mauvais type de document, carte d'identité ou passeport seulement"), 'subject' => "WARNING", 'message' => "Mauvais type de document, carte d'identité ou passeport seulement"];
        }

        if($analysisResult['reports'][0]['globalStatus'] === 'OK'){
            return ['status' => true];
        }
        if($_ENV["PLATEFORME"] === 'dev'){
            foreach ($analysisResult['lastReport']['checks'] as $indice1 => $checks) {
                $logger->error('DEBUG checks indice='.$indice1);
                $logger->error('DEBUG [checks]['.$indice1.'][type]='.$checks['type']);
                $logger->error('DEBUG [checks]['.$indice1.'][message]='.$checks['message']);
                $logger->error('DEBUG [checks]['.$indice1.'][status]='.$checks['status']);
                if (($checks['status'] == 'ERROR') || ($checks['status'] == 'WARN')) {
                    $logger->error('DEBUG ch '.$checks['type'].'=>'.$checks['message']);
                }
                if (is_array($checks))
                foreach ($checks as $clef => $check) {
                    if ($clef == 'subChecks') {
                        //foreach ($checks[$clef] as $indice2 => $subchecks) {
                        foreach ($check as $indice2 => $subchecks) {
                        $logger->error('DEBUG subChecks indice='.$indice2);
                        $logger->error('DEBUG [checks]['.$indice1.'][subchecks]['.$indice2.'][type]='.$subchecks['type']);
                        $logger->error('DEBUG [checks]['.$indice1.'][subchecks]['.$indice2.'][message]='.$subchecks['message']);
                        $logger->error('DEBUG [checks]['.$indice1.'][subchecks]['.$indice2.'][status]='.$subchecks['status']);
                        if (($subchecks['status'] == 'ERROR') || ($subchecks['status'] == 'WARN')) {
                            $logger->error('DEBUG ch/sub '.$subchecks['type'].'=>'.$subchecks['message']);
                        }
                        if (is_array($subchecks))
                        foreach ($subchecks as $clef2 => $subcheck) {
                            if ($clef2 == 'subChecks') {
                                foreach ($subcheck as $indice3 => $subchecks2) {
                                $logger->error('DEBUG subChecks/subchecks indice='.$indice3);
                                $logger->error('DEBUG [checks]['.$indice1.'][subchecks]['.$indice2.'][subchecks]['.$indice3.'][type]='.$subchecks2['type']);
                                $logger->error('DEBUG [checks]['.$indice1.'][subchecks]['.$indice2.'][subchecks]['.$indice3.'][message]='.$subchecks2['message']);
                                $logger->error('DEBUG [checks]['.$indice1.'][subchecks]['.$indice2.'][subchecks]['.$indice3.'][status]='.$subchecks2['status']);
                                if (($subchecks2['status'] == 'ERROR') || ($subchecks2['status'] == 'WARN')) {
                                    $logger->error('DEBUG ch/sub/sub '.$subchecks2['type'].'=>'.$subchecks2['message']);
                                }
                                }
                            }
                        }
                        }
                    }
                }
            }
        }
        $messageErreur = $this->translator->trans("ouverture_compte.problemes_techniques");
        foreach ($analysisResult['lastReport']['checks'] as $indice1 => $checks) {
            if (($checks['status'] == 'ERROR') || ($checks['status'] == 'WARN')) {
                $message .= $checks['status'].':'.$checks['type'].'=>'.$checks['message'].'<br>';
            }
            if (is_array($checks)) {
                foreach ($checks as $clef => $check) {
                    if ($clef == 'subChecks') {
                        foreach ($check as $indice2 => $subchecks) {
                            if (($subchecks['status'] == 'ERROR') || ($subchecks['status'] == 'WARN')) {
                                $message .= '=>'.$subchecks['status'].':'.$subchecks['type'].'=>'.$subchecks['message'].'<br>';
                            }
                            if (is_array($subchecks)) {
                                foreach ($subchecks as $clef2 => $subcheck) {
                                    if ($clef2 == 'subChecks') {
                                        foreach ($subcheck as $indice3 => $subchecks2) {
                                            if (($subchecks2['status'] == 'ERROR') || ($subchecks2['status'] == 'WARN')) {
                                                $message .= '==>'.$subchecks2['status'].':'.$subchecks2['type'].'=>'.$subchecks2['message'].'<br>';
                                            if (($subchecks2['type'] === 'DOCUMENT_VALIDITY') && ($subchecks2['message'] === 'One side of the document is missing'))
                                                    $messageErreur = $this->translator->trans('Recto ou Verso manquant');
                                            elseif (($subchecks2['identifier'] === 'MRZ_FIELDS_SYNTAX') 
                                                || ($subchecks2['identifier'] === 'MRZ_CHECKSUMS')
                                                || ($subchecks2['identifier'] === 'MRZ_EXPECTED_FOUND')
                                                || ($subchecks2['identifier'] === 'MRZ_ALIGNEMENT')
                                                || ($subchecks2['identifier'] === 'MRZ_CLASSIFIER'))
                                                    $messageErreur = $this->translator->trans("Les lignes d'information contenant des symboles <<<<<< ne sont pas lisibles");
                                            elseif ($subchecks2['identifier'] === 'DOC_EXPIRATION_DATE') 
                                                $messageErreur = $this->translator->trans("Pièce d'identité périmée");
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if(isset($analysisResult['lastReport']['info']['sidesIssue'])
            && $analysisResult['lastReport']['info']['sidesIssue']['value'] === 'MISSING_VERSO'){
            $messageErreur = $this->translator->trans('Recto ou Verso manquant');
        }

        if($analysisResult['reports'][0]['globalStatus'] === 'ERROR'){
            $subject = 'ERREUR sur creation de compte';
            $message .= '<hr>*** COMPTE NON CREE<br>';
        }

    elseif($analysisResult['reports'][0]['globalStatus'] === 'WARN'){
            $subject = 'ALERTE sur creation de compte';
            $message .= '<hr>*** COMPTE EN COURS DE CREATION MAIS PIECES D\'IDENTITE A CONTROLER<br>';
        }
    else {
        $subject = 'STATUT non supporté';
        $message .= '<hr>** Le statut '.$analysisResult['reports'][0]['globalStatus'].'n\'est pas supporté par le programme<br>';
    }


        return ['status' => false, 'message_erreur' => $messageErreur, 'subject' => $subject, 'message' => $message];
    }


    /**
     * Get the current access token
     */
    public function getAccessToken(): ?string
    {
        return $this->accessToken;
    }

    /**
     * Get all token data including refresh token, expiry, etc.
     */
    public function getTokenData(): ?array
    {
        return $this->tokenData;
    }

    /**
     * Check if user is currently authenticated
     */
    public function isAuthenticated(): bool
    {
        return $this->accessToken !== null;
    }

    /**
     * Clear the stored token data
     */
    public function logout(): void
    {
        $this->accessToken = null;
        $this->tokenData = null;
    }
}
