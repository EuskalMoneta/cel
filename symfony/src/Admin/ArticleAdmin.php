<?php

declare(strict_types=1);

namespace App\Admin;

use Sonata\AdminBundle\Admin\AbstractAdmin;
use Sonata\AdminBundle\Datagrid\DatagridMapper;
use Sonata\AdminBundle\Datagrid\ListMapper;
use Sonata\AdminBundle\Form\FormMapper;
use Sonata\AdminBundle\Show\ShowMapper;

final class ArticleAdmin extends AbstractAdmin
{

    protected function configureFormFields(FormMapper $formMapper): void
    {
        $formMapper
            ->add('libelle')
            ->add('description')
            ->add('prix')
            ->add('numeroComptePartenaire')
            ->add('emailPartenaire')
            ->add('visible')
        ;
    }

    protected function configureDatagridFilters(DatagridMapper $datagridMapper): void
    {
        $datagridMapper
            ->add('id')
            ->add('libelle')
            ->add('description')
            ->add('prix')
            ->add('numeroComptePartenaire')
            ->add('emailPartenaire')
            ->add('visible')
            ;
    }

    protected function configureListFields(ListMapper $listMapper): void
    {
        $listMapper
            ->addIdentifier('id')
            ->addIdentifier('libelle')
            ->add('description')
            ->add('prix')
            ->add('emailPartenaire')
            ->add('visible')
        ;
    }



    protected function configureShowFields(ShowMapper $showMapper): void
    {
        $showMapper
            ->add('id')
            ->add('libelle')
            ->add('description')
            ->add('prix')
            ->add('numeroComptePartenaire')
            ->add('emailPartenaire')
            ;
    }
}
