<?php

namespace App\Entity;

use App\Repository\VirementPrelevementRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: VirementPrelevementRepository::class)]
class VirementPrelevement
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $created = null;

    #[ORM\Column]
    private ?int $somme = null;

    #[ORM\Column(length: 255)]
    private ?string $debiteur = null;

    #[ORM\Column(length: 255)]
    private ?string $crediteur = null;

    #[ORM\Column]
    private ?int $statut = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $message = null;

    public function __toString(): string
    {
        return  'prelèvement de '.$this->debiteur;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCreated(): \DateTimeImmutable
    {
        return $this->created;
    }

    public function setCreated(\DateTimeImmutable $created): static
    {
        $this->created = $created;

        return $this;
    }

    public function getSomme(): ?int
    {
        return $this->somme;
    }

    public function setSomme(int $somme): static
    {
        $this->somme = $somme;

        return $this;
    }

    public function getDebiteur(): ?string
    {
        return $this->debiteur;
    }

    public function setDebiteur(string $debiteur): static
    {
        $this->debiteur = $debiteur;

        return $this;
    }

    public function getCrediteur(): ?string
    {
        return $this->crediteur;
    }

    public function setCrediteur(string $crediteur): static
    {
        $this->crediteur = $crediteur;

        return $this;
    }

    public function getStatut(): ?int
    {
        return $this->statut;
    }

    public function setStatut(int $statut): static
    {
        $this->statut = $statut;

        return $this;
    }

    public function getMessage(): ?string
    {
        return $this->message;
    }

    public function setMessage(?string $message): static
    {
        $this->message = $message;

        return $this;
    }

}
