<?php

declare(strict_types=1);

namespace App\Admin;

use Sonata\AdminBundle\Admin\AbstractAdmin;
use Sonata\AdminBundle\Datagrid\DatagridMapper;
use Sonata\AdminBundle\Datagrid\ListMapper;
use Sonata\AdminBundle\Form\FormMapper;
use Sonata\AdminBundle\Show\ShowMapper;
use Symfony\Component\Form\Extension\Core\Type\FileType;

final class PromotionAdmin extends AbstractAdmin
{

    protected function configureFormFields(FormMapper $formMapper): void
    {
        // get the current Image instance
        $image = $this->getSubject();

        // use $fileFieldOptions so we can add other options to the field
        $fileFieldOptions = ['required' => false];
        if ($image && ($webPath = $image->getWebPath()) && $image->getImage()) {
            // get the container so the full path to the image can be set
            $request = $this->getRequest();
            $fullPath = $request->getBasePath().'/'.$webPath;

            // add a 'help' option containing the preview's img tag
            $fileFieldOptions['help'] = '<img src="'.$fullPath.'" style="max-height: 300px;max-width: 300px;"/>';
            $fileFieldOptions['help_html'] = true;
        }

        $formMapper
            ->add('lien', null, ['help' => 'Mettre le lien sous la forme https://elkar.eus'])
            ->add('visible')
            ->add('file', FileType::class, $fileFieldOptions)
        ;
    }

    protected function configureDatagridFilters(DatagridMapper $datagridMapper): void
    {
        $datagridMapper
            ->add('id')
            ->add('lien')
            ->add('image')
            ->add('updated')
            ;
    }

    protected function configureListFields(ListMapper $listMapper): void
    {
        $listMapper
            ->addIdentifier('id')
            ->addIdentifier('lien')
            ->addIdentifier('image');
    }



    function prePersist(object $object): void
    {
        $this->manageFileUpload($object);
    }

    function preUpdate(object $object): void
    {
        $this->manageFileUpload($object);
    }


    private function manageFileUpload($object)
    {
        if ($object->getFile()) {
            $object->refreshUpdated();
        }
    }
}
