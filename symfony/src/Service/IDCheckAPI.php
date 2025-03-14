<?php

namespace App\Service;

use Symfony\Component\HttpFoundation\Exception\BadRequestException;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

class IDCheckAPI
{
    private ?string $accessToken = null;
    private ?array $tokenData = null;

    public function __construct(private readonly HttpClientInterface $httpClient, private readonly TranslatorInterface $translator) {}

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

    public function go_nogo($analysisResult): array
    {
        $message = '';

        if($analysisResult['type'] !== 'ID' && $analysisResult['type'] !== 'P'){
            return ['status' => false, 'message_erreur' => $this->translator->trans("Mauvais type de document, carte d'identité ou passeport seulement"), 'subject' => "WARNING", 'message' => "Mauvais type de document, carte d'identité ou passeport seulement"];
        }

        if($analysisResult['reports'][0]['globalStatus'] === 'OK'){
            return ['status' => true];
        }

        foreach ($analysisResult['lastReport']['checks'] as $indice1 => $checks) {
            if (($checks['status'] == 'ERROR') || ($checks['status'] == 'WARN')) {
                $message .= $checks['status'].':'.$checks['type'].'=>'.$checks['message'].'<br>';
            }
            if (is_array($checks))
                foreach ($checks as $clef => $check) {
                    if ($clef == 'subChecks') {
                        foreach ($check as $indice2 => $subchecks) {
                            if (($subchecks['status'] == 'ERROR') || ($subchecks['status'] == 'WARN')) {
                                $message .= '=>'.$subchecks['status'].':'.$subchecks['type'].'=>'.$subchecks['message'].'<br>';
                            }
                            if (is_array($subchecks))
                                foreach ($subchecks as $clef2 => $subcheck) {
                                    if ($clef2 == 'subChecks') {
                                        foreach ($subcheck as $indice3 => $subchecks2) {
                                            if (($subchecks2['status'] == 'ERROR') || ($subchecks2['status'] == 'WARN')) {
                                                $message .= '==>'.$subchecks2['status'].':'.$subchecks2['type'].'=>'.$subchecks2['message'].'<br>';
                                            }
                                        }
                                    }
                                }
                        }
                    }
                }
        }
        $messageErreur = $this->translator->trans("ouverture_compte.problemes_techniques");

        if(isset($analysisResult['lastReport']['info']['sidesIssue'])
            && $analysisResult['lastReport']['info']['sidesIssue']['value'] === 'MISSING_VERSO'){
            $messageErreur = $this->translator->trans('Recto ou Verso manquant');
        }

        if(isset($analysisResult['lastReport']['checks'][1]['subChecks'][3]['subChecks'][5])
            && $analysisResult['lastReport']['checks'][1]['subChecks'][3]['subChecks'][5]['identifier'] === 'MRZ_FIELDS_SYNTAX'){
            $messageErreur = $this->translator->trans("Les lignes d'information contenant des symboles <<<<<< ne sont pas lisibles");
        }

        if(isset($analysisResult['lastReport']['checks'][1]['subChecks'][3]['subChecks'][6])
            && $analysisResult['lastReport']['checks'][1]['subChecks'][3]['subChecks'][6]['identifier'] === 'MRZ_CHECKSUMS'){
            $messageErreur = $this->translator->trans("Les lignes d'information contenant des symboles <<<<<< ne sont pas lisibles");
        }

        if(isset($analysisResult['lastReport']['checks'][1]['subChecks'][3]['subChecks'][7])
            && $analysisResult['lastReport']['checks'][1]['subChecks'][3]['subChecks'][7]['identifier'] === 'MRZ_EXPECTED_FOUND'){
            $messageErreur = $this->translator->trans("Les lignes d'information contenant des symboles <<<<<< ne sont pas lisibles");
        }

        if(isset($analysisResult['lastReport']['checks'][1]['subChecks'][3]['subChecks'][15])
            && $analysisResult['lastReport']['checks'][1]['subChecks'][3]['subChecks'][15]['identifier'] === 'MRZ_ALIGNEMENT'){
            $messageErreur = $this->translator->trans("Les lignes d'information contenant des symboles <<<<<< ne sont pas lisibles");
        }

        if(isset($analysisResult['lastReport']['checks'][1]['subChecks'][3]['subChecks'][16])
            && $analysisResult['lastReport']['checks'][1]['subChecks'][3]['subChecks'][16]['identifier'] === 'MRZ_CLASSIFIER'){
            $messageErreur = $this->translator->trans("Les lignes d'information contenant des symboles <<<<<< ne sont pas lisibles");
        }

        if(isset($analysisResult['lastReport']['checks'][1]['subChecks'][2])
            && $analysisResult['lastReport']['checks'][1]['subChecks'][2]['identifier'] === 'DOC_EXPIRATION_DATE'){
            $messageErreur = $this->translator->trans("Pièce d'identité périmée");
        }


        $subject = 'STATUT non supporté';
        $message .= '<hr>** Le statut n\'est pas supporté par le programme<br>';

        if($analysisResult['reports'][0]['globalStatus'] === 'ERR'){
            $subject = 'ERREUR sur creation de compte';
            $message .= '<hr>*** COMPTE NON CREE<br>';
        }

        if($analysisResult['reports'][0]['globalStatus'] === 'WARN'){
            $subject = 'ALERTE sur creation de compte';
            $message .= '<hr>*** COMPTE EN COURS DE CREATION MAIS PIECES D\'IDENTITE A CONTROLER<br>';
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
