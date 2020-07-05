<?php

namespace App\Repository;

use App\Entity\WebHookEvent;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @method WebHookEvent|null find($id, $lockMode = null, $lockVersion = null)
 * @method WebHookEvent|null findOneBy(array $criteria, array $orderBy = null)
 * @method WebHookEvent[]    findAll()
 * @method WebHookEvent[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class WebHookEventRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, WebHookEvent::class);
    }

    // /**
    //  * @return WebHookEvent[] Returns an array of WebHookEvent objects
    //  */
    /*
    public function findByExampleField($value)
    {
        return $this->createQueryBuilder('w')
            ->andWhere('w.exampleField = :val')
            ->setParameter('val', $value)
            ->orderBy('w.id', 'ASC')
            ->setMaxResults(10)
            ->getQuery()
            ->getResult()
        ;
    }
    */

    /*
    public function findOneBySomeField($value): ?WebHookEvent
    {
        return $this->createQueryBuilder('w')
            ->andWhere('w.exampleField = :val')
            ->setParameter('val', $value)
            ->getQuery()
            ->getOneOrNullResult()
        ;
    }
    */
}
