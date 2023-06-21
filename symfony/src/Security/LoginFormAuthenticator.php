<?php

namespace App\Security;

use App\Controller\APIToolbox;
use App\Entity\Statistique;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAuthenticationException;
use Symfony\Component\Security\Core\Exception\InvalidCsrfTokenException;
use Symfony\Component\Security\Core\Security;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\UserProviderInterface;
use Symfony\Component\Security\Csrf\CsrfToken;
use Symfony\Component\Security\Csrf\CsrfTokenManagerInterface;
use Symfony\Component\Security\Guard\Authenticator\AbstractFormLoginAuthenticator;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\Credentials\CustomCredentials;
use Symfony\Component\Security\Http\Authenticator\Passport\Credentials\PasswordCredentials;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;
use Symfony\Component\Security\Http\Util\TargetPathTrait;

class LoginFormAuthenticator extends AbstractAuthenticator
{
    use TargetPathTrait;

    private $urlGenerator;
    private $csrfTokenManager;
    private $apiToolBox;
    private $em;
    private $password;

    public function __construct(UrlGeneratorInterface $urlGenerator,
                                CsrfTokenManagerInterface $csrfTokenManager,
                                APIToolbox $APIToolbox,
                                EntityManagerInterface $em)
    {
        $this->urlGenerator = $urlGenerator;
        $this->csrfTokenManager = $csrfTokenManager;
        $this->apiToolBox = $APIToolbox;
        $this->em = $em;
    }

    public function supports(Request $request):?bool
    {
        return
            'app_login' === $request->attributes->get('_route')
            && $request->isMethod('POST');
    }

    public function authenticate(Request $request): Passport
    {
        $username = $request->request->get('username');
        $this->password = $request->request->get('password');
        //force username uppercase if username is not an email
        if (strpos($username, '@') === false) {
            $username = strtoupper($username);
        }

        if (null === $username) {
            // The token header was empty, authentication fails with HTTP Status
            // Code 401 "Unauthorized"
            throw new CustomUserMessageAuthenticationException('No username provided');
        }
        $APIToolbox = $this->apiToolBox;
        return new SelfValidatingPassport(
            new UserBadge($username, function ($username){
                $user = null;
                // Load / create our user however you need.
                // You can do this by calling the user provider, or with custom logic here.
                $token = $this->apiToolBox->curlGetToken($username, $this->password);

                if (!$token) {
                    // fail authentication with a custom error
                    throw new CustomUserMessageAuthenticationException('Erreur de connexion');
                }

                // Get member
                $member = null;
                if (str_contains($username, '@') === false) {
                    $responseMember = $this->apiToolBox->curlRequest('GET', '/members/?login='.$username, '', $token);
                    if($responseMember['httpcode'] == 200) {
                        $member = $responseMember['data'][0];
                    }
                } else {
                    $responseMember = $this->apiToolBox->curlRequest('GET', '/members/?email='.$username, '', $token);
                    if($responseMember['httpcode'] == 200) {
                        $member = $responseMember['data'];
                    }
                }
                if ($member != null) {
                    $user = new User();
                    $user->setUsername($member->login);
                    $user->setLastLogin(new \DateTime());
                    $user->setToken($token);

                    //User Roles
                    if($user->getUsername()[0] === 'E'){
                        $user->setRoles(['ROLE_CLIENT']);
                    }
                    elseif($user->getUsername()[0] === 'Z') {
                        $user->setRoles(['ROLE_PARTENAIRE']);
                    }
                    elseif($user->getUsername()[0] === 'T') {
                        $user->setRoles(['ROLE_TOURISTE']);
                    }
                    if($member->type === 'Régie publique de recettes'){
                        $user->setRoles(['ROLE_PARTENAIRE', 'ROLE_REGIE']);
                    }

                    // set locale according to the language chosen by the user
                    if($member->array_options->options_langue === 'eu'){
                        $user->setLocale($member->array_options->options_langue);
                    } else {
                        $user->setLocale('fr');
                    }

                    $stat = new Statistique();
                    $stat->setType('connexion');
                    $stat->setDate(new \DateTime());
                    $stat->setValue($user->getUsername());
                    $this->em->persist($stat);
                    $this->em->flush();
                }

                return $user;
            })
        );

        return new Passport(new UserBadge($username), new CustomCredentials(
        // If this function returns anything else than `true`, the credentials
        // are marked as invalid.
        // The $credentials parameter is equal to the next argument of this class
            function ($credentials, APIToolbox $APIToolbox, UserInterface $user) {

                return $user->getApiToken() === $password;
            },

            // The custom credentials
            $password
        ));
        //return new Passport(new UserBadge($username), new CustomCredentials($request->request->get('password')));
    }



    public function getCredentials(Request $request)
    {
        $username = $request->request->get('username');
        //force username uppercase if username is not an email
        if (strpos($username, '@') === false) {
            $username = strtoupper($username);
        }

        $credentials = [
            'username' => $username,
            'password' => $request->request->get('password'),
            'csrf_token' => $request->request->get('_csrf_token'),
        ];

        $request->getSession()->set(
            Security::LAST_USERNAME,
            $credentials['username']
        );

        return $credentials;
    }

    public function getUser($credentials, UserProviderInterface $userProvider)
    {
        $token = new CsrfToken('authenticate', $credentials['csrf_token']);
        if (!$this->csrfTokenManager->isTokenValid($token)) {
            throw new InvalidCsrfTokenException();
        }

        // Load / create our user however you need.
        // You can do this by calling the user provider, or with custom logic here.
        $token = $this->apiToolBox->curlGetToken($credentials['username'], $credentials['password']);

        if (!$token) {
            // fail authentication with a custom error
            throw new CustomUserMessageAuthenticationException('Erreur de connexion');
        }

        // Get member
        $member = null;
        if (strpos($credentials['username'], '@') === false) {
            $responseMember = $this->apiToolBox->curlRequest('GET', '/members/?login='.$credentials['username'], '', $token);
            if($responseMember['httpcode'] == 200) {
                $member = $responseMember['data'][0];
            }
        } else {
            $responseMember = $this->apiToolBox->curlRequest('GET', '/members/?email='.$credentials['username'], '', $token);
            if($responseMember['httpcode'] == 200) {
                $member = $responseMember['data'];
            }
        }
        if ($member != null) {
            $user = new User();
            $user->setUsername($member->login);
            $user->setLastLogin(new \DateTime());
            $user->setToken($token);

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

            $stat = new Statistique();
            $stat->setType('connexion');
            $stat->setDate(new \DateTime());
            $stat->setValue($user->getUsername());
            $this->em->persist($stat);
            $this->em->flush();
        }

        return $user;
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        if ($targetPath = $this->getTargetPath($request->getSession(), $firewallName)) {
            return new RedirectResponse($targetPath);
        }
        return new RedirectResponse($this->urlGenerator->generate('app_homepage'));

    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        $data = [
            // you may want to customize or obfuscate the message first
            'message' => strtr($exception->getMessageKey(), $exception->getMessageData())

            // or to translate this message
            // $this->translator->trans($exception->getMessageKey(), $exception->getMessageData())
        ];

        return new JsonResponse($data, Response::HTTP_UNAUTHORIZED);
    }

}
