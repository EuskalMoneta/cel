<?php

declare(strict_types=1);

namespace App\Admin;

use App\Entity\BonPlan;
use Sonata\AdminBundle\Admin\AbstractAdmin;
use Sonata\AdminBundle\Datagrid\DatagridMapper;
use Sonata\AdminBundle\Datagrid\ListMapper;
use Sonata\AdminBundle\Form\FormMapper;
use Sonata\AdminBundle\Show\ShowMapper;
use Sonata\Form\Type\DatePickerType;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;

final class BonPlanAdmin extends AbstractAdmin
{

    protected function configureFormFields(FormMapper $formMapper): void
    {
        // get the current Image instance
        /** @var BonPlan $image */
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
            ->add('titre')
            ->add('dateDebut', DatePickerType::class)
            ->add('dateFin', DatePickerType::class)

            ->add('file', FileType::class, $fileFieldOptions)
            ->add('descriptifOffre', TextareaType::class, array(
                    'attr' => array('class' => 'ckeditor'),
                    'required' => false)
            )
            ->add('descriptionComplet', TextareaType::class, array(
                    'attr' => array('class' => 'ckeditor'),
                    'required' => false)
            )
            ->add('visible');

    }

    protected function configureDatagridFilters(DatagridMapper $datagridMapper): void
    {
        $datagridMapper
            ->add('id')
            ->add('image')
            ->add('updated')
        ;
    }

    protected function configureListFields(ListMapper $listMapper): void
    {
        $listMapper
            ->addIdentifier('id')
            ->addIdentifier('titre')
            ->add('dateDebut')
            ->add('dateFin')
            ->add('visible');
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
