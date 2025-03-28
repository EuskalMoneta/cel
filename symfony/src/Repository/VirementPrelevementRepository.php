<?php

namespace App\Repository;

use App\Entity\VirementPrelevement;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<VirementPrelevement>
 */
class VirementPrelevementRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, VirementPrelevement::class);
    }
    public function findByFilters(
        string $crediteur,
        ?\DateTimeImmutable $dateFrom = null,
        ?\DateTimeImmutable $dateTo = null,
        ?string $debiteur = null,
        ?string $statut = null)
    {
        $qb = $this->createQueryBuilder('v')
            ->andWhere('v.crediteur LIKE :crediteur')
            ->setParameter('crediteur', "%{$crediteur}%");

        if ($dateFrom) {
            $qb->andWhere('v.created >= :dateFrom')
                ->setParameter('dateFrom', $dateFrom);
        }

        if ($dateTo) {
            $qb->andWhere('v.created <= :dateTo')
                ->setParameter('dateTo', $dateTo);
        }

        if ($debiteur) {
            $qb->andWhere('(v.debiteur LIKE :debiteur OR v.debiteurCompte LIKE :debiteur)')
                ->setParameter('debiteur', "%{$debiteur}%");
        }

        if ($statut !== 'null') {
            $qb->andWhere('v.statut = :statut')
                ->setParameter('statut', $statut);
        }

        // Default sorting by date (descending) and debiteur
        $qb->orderBy('v.created', 'DESC')
            ->addOrderBy('v.debiteur', 'ASC');

        return $qb->getQuery();
    }
}
