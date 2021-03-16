<?php

namespace App\Repository;

use App\Entity\Statistique;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @method Statistique|null find($id, $lockMode = null, $lockVersion = null)
 * @method Statistique|null findOneBy(array $criteria, array $orderBy = null)
 * @method Statistique[]    findAll()
 * @method Statistique[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class StatistiqueRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Statistique::class);
    }

    public function getExportQueryDateOnly($start, $end, $type)
    {

        $dateS = new \DateTime($start);
        $dateE = new \DateTime($end);

        $qb = $this
            ->createQueryBuilder('s')
            ->select('s.value, count(s.id) as count')
            ->where('s.date <= :end')
            ->andWhere('s.date >= :start')
            ->andWhere('s.type LIKE :type')
            ->setParameter('end', $dateE)
            ->setParameter('start', $dateS)
            ->setParameter('type', $type)
            ->groupBy('s.value')
        ;

        return $qb
            ->getQuery()
            ->getResult()
            ;

    }

}
