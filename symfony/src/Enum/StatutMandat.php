<?php

namespace App\Enum;

enum StatutMandat: string
{
    case REFUSE = 'REF';
    case REVOQUE = 'REV';
    case ATTENTE = 'ATT';
    case VALIDE = 'VAL';

    public function getLabel(): string
    {
        return match($this) {
            self::REFUSE => 'Refusé',
            self::REVOQUE => 'Révoqué',
            self::ATTENTE => 'En attente',
            self::VALIDE => 'Validé',
        };
    }

    public function getCssClass(): string
    {
        return match($this) {
            self::REFUSE => 'text-danger',
            self::REVOQUE => 'text-danger',
            self::ATTENTE => 'text-warning',
            self::VALIDE => 'text',
            default => '',
        };
    }
}