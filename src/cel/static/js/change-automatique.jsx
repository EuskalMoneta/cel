import {
    fetchAuth,
    getAPIBaseURL,
    getCurrentLang,
    SelectizeUtils,
} from 'Utils'

const {
    Input,
    Textarea,
} = FRC

Formsy.addValidationRule('isMoreThanTen', (values, value) => {
    return Number(value) >= Number(10)
})

Formsy.addValidationRule('isDifferentThanActualAmount', (values, value, actualAmount) => {
    return Number(value).toFixed(0) != Number(actualAmount)
})

import ReactSelectize from 'react-selectize'
const SimpleSelect = ReactSelectize.SimpleSelect

import ModalEusko from 'Modal'

const {
    ToastContainer
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)

const ChangeAutoForm = React.createClass({

    mixins: [FRC.ParentContextMixin],

    propTypes: {
        children: React.PropTypes.node
    },

    render() {
        return (
            <Formsy.Form
                className={this.getLayoutClassName()}
                {...this.props}
                ref="profil-form"
            >
                {this.props.children}
            </Formsy.Form>
        );
    }
})

const ChangeAuto = React.createClass({

    getInitialState() {
        return {
            member: null,
            canSubmit: false,
            hasChangeAuto: undefined,
            newAmountChangeAuto: undefined,
            amountChangeAuto: undefined,
            periodiciteChangeAuto: undefined,
            rumChangeAuto: undefined,
            modalBody: undefined,
            modalTitle: undefined,
            validateLabel: undefined,
            isModalOpen: false,
            modalMode: undefined,
            textareaCommentaire: '',
        }
    },

    enableButton() {
        this.setState({canSubmit: true})
    },

    disableButton() {
        this.setState({canSubmit: false})
    },

    amountOnValueChange(event, value) {
        this.setState({newAmountChangeAuto: value})
    },

    commentOnValueChange(event, value) {
        this.setState({textareaCommentaire: value})
    },

    openModal() {
        this.setState({isModalOpen: true})
    },

    hideModal() {
        this.setState({isModalOpen: false, textareaCommentaire: '', newAmountChangeAuto: undefined, modalBody: undefined})
    },

    getModalElements(modalMode) {
        if (modalMode == 'delete') {
            var modalTitle = __("Arrêt du change automatique")
            var validateLabel = __("Confirmer")
            var modalBody = (
                <ChangeAutoForm onValid={this.enableButton}>
                    <p style={{marginBottom: 30}}>
                        {__("Êtes-vous sûr de vouloir arrêter votre change automatique mensuel ?")}
                    </p>
                    <Textarea
                        name="commentaire"
                        value={this.state.textareaCommentaire}
                        data-eusko="change-auto-commentaire"
                        rows={3}
                        onChange={this.commentOnValueChange}
                        elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-8']}
                        label={__("Commentaire")}
                        placeholder={__("Vous pouvez fournir un commentaire")}
                    />
                </ChangeAutoForm>
            )
            var canSubmit = true
        }
        else {
            var modalTitle = __("Modification du change automatique")
            var validateLabel = __("Confirmer")
            var canSubmit = false
            var modalBody = (
                    <ChangeAutoForm onValid={this.enableButton}>
                        <Input
                            name="montant"
                            data-eusko="change-auto-amount"
                            validations={"isMoreThanTen,isDifferentThanActualAmount:" + this.state.amountChangeAuto}
                            validationErrors={{
                                isMoreThanTen: __("Un change automatique ne peut être en dessous de 10."),
                                isDifferentThanActualAmount: __("Veuillez choisir une autre montant que votre change actuel.")
                            }}
                            label={__("Montant")}
                            type="number"
                            placeholder={__("Montant du change automatique")}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-8']}
                            required={true}
                            onChange={this.amountOnValueChange}
                            value={this.state.newAmountChangeAuto ? this.state.newAmountChangeAuto : ""}
                        />
                        <Textarea
                            name="commentaire"
                            value={this.state.textareaCommentaire}
                            data-eusko="change-auto-commentaire"
                            rows={3}
                            onChange={this.commentOnValueChange}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-8']}
                            label={__("Commentaire")}
                            placeholder={__("Vous pouvez fournir un commentaire")}
                        />
                    </ChangeAutoForm>
            )
        }
        this.setState({modalBody: modalBody, modalMode: modalMode, canSubmit: canSubmit,
                       textareaCommentaire: '', newAmountChangeAuto: undefined,
                       modalTitle: modalTitle, validateLabel: validateLabel}, this.openModal)
    },

    componentDidMount() {
        // Get member data
        var computeMemberData = (member) => {
            if (Number(member[0].array_options.options_prelevement_change_montant) > Number()
                && member[0].array_options.options_prelevement_change_periodicite) {
                var hasChangeAuto = true
            }
            else
                var hasChangeAuto = false

            this.setState({
                member: member[0],
                amountChangeAuto: Number(member[0].array_options.options_prelevement_change_montant).toFixed(0),
                rumChangeAuto: member[0].array_options.options_prelevement_change_rum,
                periodiciteChangeAuto: member[0].array_options.options_prelevement_change_periodicite,
                hasChangeAuto: hasChangeAuto,
            })

        }
        fetchAuth(this.props.url + window.config.userName, 'GET', computeMemberData)
    },

    submitForm(modalMode) {
        // We push fields into the data object that will be passed to the server
        var data = {}
        data.mode = modalMode
        data.prelevement_change_comment = this.state.textareaCommentaire
        if (modalMode == 'modify') {
            data.options_prelevement_change_montant = this.state.newAmountChangeAuto
        }
        else {
            data.options_prelevement_change_montant = null
            data.options_prelevement_change_periodicite = null
        }

        var computeForm = (data) => {
            this.refs.container.success(
                __("Votre demande a bien été prise en compte."),
                "",
                {
                    timeOut: 3000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }

        var promiseError = (err) => {
            // Error during request, or parsing NOK :(
            this.enableButton()

            console.log(this.props.url, err)
            this.refs.container.error(
                __("Une erreur s'est produite lors de la modification de votre change automatique !"),
                "",
                {
                    timeOut: 3000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }
        fetchAuth(getAPIBaseURL + "members/" + this.state.member.id + "/", 'PATCH', computeForm, data, promiseError)
    },


    render() {

        if (this.state.hasChangeAuto === true) {
            var divContent = (
                <div>
                    {__('Vous changez mensuellement des euros en eusko grâce à un prélèvement automatique sur votre compte bancaire.')}
                    <br/>
                    {__('Les prélèvements sont effectués le 10 de chaque mois.')}<br/>
                    {__('Montant de votre change automatique : ') + this.state.amountChangeAuto} eusko
                    <br/><br/>
                    <h4>{__('Informations sur le mandat de prélèvement')}</h4>
                    {__('Nom du créancier :')} Association Euskal Moneta - Monnaie Locale du Pays Basque<br/>
                    {__('Identifiant du créancier :')} FR49ZZZ663869<br/>
                    {__('Référence Unique du Mandat :') + ' ' + this.state.rumChangeAuto}
                    <br/><br/>
                    <div className="row">
                        <div className="col-md-3 col-md-offset-1">
                            <button onClick={() => {this.getModalElements('modify')}}
                                className="btn btn-info enable-pointer-events">
                                {__("Modifier le montant du change automatique")} <i className="glyphicon glyphicon-pencil"></i>
                            </button>
                        </div>
                        <div className="col-md-4 col-md-offset-1">
                            <button onClick={() => {this.getModalElements('delete')}}
                                className="btn btn-danger enable-pointer-events">
                                {__("Arrêter le change automatique")} <i className="glyphicon glyphicon-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )
        }
        else if (this.state.hasChangeAuto === false) {
            var divContent = (
                <div>
                    {__("Vous pouvez mettre en place un change mensuel d'euros en eusko grâce à un prélèvement automatique sur votre compte bancaire.")}<br/>
                    {__("Pour cela, vous devez autoriser Euskal Moneta à effectuer des prélèvements sur votre compte bancaire :")}<br/>
                    {__("remplissez et signez le mandat ci-dessous et renvoyez-le à Euskal Moneta avec le RIB du compte à débiter.")}<br/><br/>
                    <a href={window.config.mandatPrelevementURL} target="_blank">
                        {__("Télécharger le mandat de prélèvement")}
                        <i style={{marginLeft: 5}} className="glyphicon glyphicon-download-alt"></i>
                    </a>
                    <br/><br/>
                    {__("Documents à envoyer par mail à euskokart@euskalmoneta.org ou par courrier à :")}<br/>
                    Euskal Moneta - 20 rue des Cordeliers - 64100 Bayonne.
                </div>
            )
        }
        else {
            var divContent = null
        }

        return (
                <div className="row">
                    <br/>
                    {divContent}
                    <ToastContainer ref="container"
                        toastMessageFactory={ToastMessageFactory}
                        className="toast-top-right toast-top-right-navbar"
                    />
                    <ModalEusko
                        hideModal={this.hideModal}
                        isModalOpen={this.state.isModalOpen}
                        modalBody={this.state.modalBody}
                        modalTitle={this.state.modalTitle}
                        validateLabel={this.state.validateLabel}
                        onValidate={() => { this.submitForm(this.state.modalMode) }}
                        staticContent={true}
                        btnValidateClass={this.state.modalMode == "delete" ? "btn-danger" : "btn-success"}
                        btnValidateEnabled={this.state.canSubmit}
                    />
                </div>
            )
        }
    }
)

ReactDOM.render(
    <ChangeAuto url={getAPIBaseURL + "members/?login="} postUrl={getAPIBaseURL + "members/"} />,
    document.getElementById('change-automatique')
)
document.title = __("Mon profil") + ": " + __("Change automatique") + " - " + __("Compte en ligne") + " " + document.title
