<?php

namespace App\Entity;

use App\Repository\MotivationRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: MotivationRepository::class)]
class Motivation
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $declencheur = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $declencheurAutre = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $motivations = null;

    #[ORM\Column(length: 120, nullable: true)]
    private ?string $user = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $created = null;

    public function __construct()
    {
        $this->motivations = [];
        $this->created = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getDeclencheur(): ?string
    {
        return $this->declencheur;
    }

    public function setDeclencheur(?string $declencheur): static
    {
        $this->declencheur = $declencheur;

        return $this;
    }

    public function getDeclencheurAutre(): ?string
    {
        return $this->declencheurAutre;
    }

    public function setDeclencheurAutre(?string $declencheurAutre): static
    {
        $this->declencheurAutre = $declencheurAutre;

        return $this;
    }

    public function getMotivations(): ?array
    {
        return $this->motivations;
    }

    public function setMotivations(?array $motivations): static
    {
        $this->motivations = $motivations;

        return $this;
    }

    public function getUser(): ?string
    {
        return $this->user;
    }

    public function setUser(?string $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getCreated(): ?\DateTimeImmutable
    {
        return $this->created;
    }

    public function setCreated(\DateTimeImmutable $created): static
    {
        $this->created = $created;

        return $this;
    }
}
