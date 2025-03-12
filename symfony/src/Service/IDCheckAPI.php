<?php

namespace App\Service;

use Symfony\Component\HttpFoundation\Exception\BadRequestException;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class IDCheckAPI
{
    private ?string $accessToken = null;
    private ?array $tokenData = null;

    public function __construct(private readonly HttpClientInterface $httpClient) {}

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

    public function go_nogo($analysisResult)
    {
        if($analysisResult['type'] !== 'ID' && $analysisResult['type'] !== 'P'){
            return ['status' => false, 'message' => "Mauvais type de document, carte d'identité ou passeport seulement"];
        }

        if($analysisResult['reports'][0]['globalStatus'] === 'ERR'){
            return ['status' => false, 'message' => "Document invalide"];
        }


        return true;
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
