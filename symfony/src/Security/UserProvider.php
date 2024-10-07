<?php

namespace App\Security;

use App\Controller\APIToolbox;
use App\Entity\Statistique;
use Psr\Log\LoggerInterface;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAuthenticationException;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\Exception\UserNotFoundException;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\UserProviderInterface;

class UserProvider implements UserProviderInterface
{
    private $apiToolBox;
    private $logger;

    public function __construct(APIToolbox $APIToolbox, LoggerInterface $logger)
    {
        $this->apiToolBox = $APIToolbox;
        $this->logger = $logger;
    }


    public function loadUserByIdentifier(string $identifier): UserInterface
    {
        $user = new User();

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

    /**
     * Refreshes the user after being reloaded from the session.
     *
     * When a user is logged in, at the beginning of each request, the
     * User object is loaded from the session and then this method is
     * called. Your job is to make sure the user's data is still fresh by,
     * for example, re-querying for fresh User data.
     *
     * If your firewall is "stateless: true" (for a pure API), this
     * method is not called.
     *
     * @return UserInterface
     */
    public function refreshUser(UserInterface $user): UserInterface
    {
        if (!$user instanceof User) {
            throw new UnsupportedUserException(sprintf('Invalid user class "%s".', get_class($user)));
        }


        /* Petit trick pour éviter une redirection loop au login lorsque refresh user est appelée avant qu'on ait l'objet user.*/
        if(method_exists($user, 'getLastLogin') && $user->getLastLogin() > (new \DateTime("now")) ){
            $responseMember = $this->apiToolBox->curlRequest('GET', '/members/?login='.$user->getUsername());
            if($responseMember['httpcode'] != 200){
                throw new UserNotFoundException('Votre session a expirée, merci de vous re-connecter');
            }
        }

        // fail authentication with a custom error
        //throw new UserNotFoundException('Votre session a expirée, merci de vous re-connecter');

        return $user;
    }

    /**
     * Tells Symfony to use this provider for this User class.
     */
    public function supportsClass($class): bool
    {
        return User::class === $class;
    }
}
