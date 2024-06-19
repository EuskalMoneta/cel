<?php

namespace App\Service;

use Symfony\Component\Mime\Part\DataPart;
use Symfony\Component\Mime\Part\Multipart\FormDataPart;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\RedirectionExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\ServerExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class YouSignAPI
{
    public function __construct(private readonly HttpClientInterface $yousignClient) {}


    /**
     * Initiate a Signature Request
     *
     * You will now initiate a Signature Request
     * The attribute delivery_mode is set at none because we do not want Yousign to send an email to notify the Signer
     * in this scenario. If we had some, Approvers or Followers wouldn't have been notified either.
     *
     * @param string $name
     * @return mixed
     */
    public function createSignatureRequest(string $name): mixed
    {
        try {
            $response = $this->yousignClient->request(
                'POST',
                'v3/signature_requests',
                [
                    'body' => <<<JSON
                      {
                        "name": "$name",
                        "delivery_mode": "none",
                        "timezone": "Europe/Paris"
                      }
                      JSON,
                    'headers' => [
                        'Content-Type' => 'application/json',
                    ],
                ]
            );
            $return =  json_decode($response->getContent());
        } catch (\Exception $e) {
            throw new \Error($e->getMessage());
        }

        return $return;
    }


    /**
     * Upload a Document
     *
     * Prepare the document (PDF) you want to request a signature on.
     *
     * @param string $signatureRequestId
     * @param string $filePath
     * @param string $fileName
     * @return mixed
     */
    public function addDocumentToSignatureRequest(string $signatureRequestId,
                                                  string $filePath,
                                                  string $fileName): mixed
    {

        $formFields = [
            'nature' => 'signable_document',
            'file' => DataPart::fromPath($filePath, $fileName, 'application/pdf'),
            'parse_anchors' => 'true'
        ];

        $formData = new FormDataPart($formFields);
        $headers = $formData->getPreparedHeaders()->toArray();

        try {
            $response = $this->yousignClient->request(
                'POST',
                sprintf('v3/signature_requests/%s/documents', $signatureRequestId),
                [
                    'headers' => $headers,
                    'body' => $formData->bodyToIterable(),

                ]
            );
            $return =  json_decode($response->getContent());
        } catch (\Exception $e) {
            throw new \Error($e->getMessage());
        }

        return $return;
    }

    /**
     * Add a Signer's to your Signature Request.
     * A Signer must have at least one Signature Field. The signature Field represents the place on the document where
     * the Signer will apply his signature. A Signature Field must be associated with a document.
     *
     * @param string $signatureRequestId
     * @param string $documentId
     * @return mixed
     */
    public function addSignerToSignatureRequest(string $signatureRequestId,
                                                string $documentId,
                                                string $firstName,
                                                string $lastName,
                                                string $email,
                                                string $phoneNumber,
    ): mixed
    {
        try {
            $response = $this->yousignClient->request(
                'POST',
                sprintf('v3/signature_requests/%s/signers', $signatureRequestId),
                [
                    'body' => <<<JSON
                       {
                           "info":{
                              "first_name":"$firstName",
                              "last_name":"$lastName",
                              "email":"$email",
                              "locale":"fr",
                              "phone_number": "$phoneNumber"
                           },
                           "signature_level":"electronic_signature",
                           "signature_authentication_mode":"otp_sms"
                       }
                       JSON,
                    'headers' => [
                        'Content-Type' => 'application/json',
                    ],
                ]);
            $return =  json_decode($response->getContent());

        } catch (\Exception $e) {
            throw new \Error($e->getMessage());
        }
        return $return;
    }

    /**
     * Final step, activate the Signature Request and get the URL for the iframe
     *
     * @param string $signatureRequestId
     * @return mixed
     */
    public function activateSignatureRequest(string $signatureRequestId): mixed
    {
        try {
            $response = $this->yousignClient->request(
                'POST',
                sprintf('v3/signature_requests/%s/activate', $signatureRequestId)
            );

            $return =  json_decode($response->getContent());

        } catch (\Exception $e) {
            throw new \Error($e->getMessage());
        }
        return $return;
    }


    /**
     * Download signed document from yousign
     * Since v3, the document is no longer base64_encoded
     *
     * @param string $signatureRequestId
     * @param string $documentId
     * @return mixed
     */
    public function downloadDocumentRequest(string $signatureRequestId, string $documentId): mixed
    {
        try {
            $response = $this->yousignClient->request(
                'GET',
                sprintf('v3/signature_requests/%s/documents/%s/download', $signatureRequestId, $documentId),
                [
                    'headers' => [

                    ],
                ]
            );

            $return = $response->getContent();

        } catch (\Exception $e) {
            throw new \Error($e->getMessage());
        }
        return $return;
    }

}