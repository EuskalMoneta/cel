<?php

namespace App\Entity;

use App\Repository\ArticleRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity(repositoryClass=ArticleRepository::class)
 */
class Article
{
    /**
     * @ORM\Id()
     * @ORM\GeneratedValue()
     * @ORM\Column(type="integer")
     */
    private $id;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $libelle;

    /**
     * @ORM\Column(type="text", nullable=true)
     */
    private $description;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $prix;

    /**
     * @ORM\Column(type="string", length=9, nullable=true)
     */
    private $numeroComptePartenaire;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $emailPartenaire;

    /**
     * @ORM\Column(type="boolean", nullable=true)
     */
    private $visible;

    public function __toString()
    {
        return $this->libelle;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getLibelle(): ?string
    {
        return $this->libelle;
    }

    public function setLibelle(string $libelle): self
    {
        $this->libelle = $libelle;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): self
    {
        $this->description = $description;

        return $this;
    }

    public function getPrix(): ?float
    {
        return $this->prix;
    }

    public function setPrix(?float $prix): self
    {
        $this->prix = $prix;

        return $this;
    }

    public function getNumeroComptePartenaire(): ?string
    {
        return $this->numeroComptePartenaire;
    }

    public function setNumeroComptePartenaire(?string $numeroComptePartenaire): self
    {
        $this->numeroComptePartenaire = $numeroComptePartenaire;

        return $this;
    }

    public function getEmailPartenaire(): ?string
    {
        return $this->emailPartenaire;
    }

    public function setEmailPartenaire(?string $emailPartenaire): self
    {
        $this->emailPartenaire = $emailPartenaire;

        return $this;
    }

    public function getVisible(): ?bool
    {
        return $this->visible;
    }

    public function setVisible(?bool $visible): self
    {
        $this->visible = $visible;

        return $this;
    }
}
