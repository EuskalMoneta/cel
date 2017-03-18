import {
    fetchAuth,
    getAPIBaseURL,
} from 'Utils'

import ModalEusko from 'Modal'

import {
    BootstrapTable,
    TableHeaderColumn,
} from 'react-bootstrap-table'
import 'node_modules/react-bootstrap-table/dist/react-bootstrap-table.min.css'

const {
    ToastContainer
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)


class BeneficiairesButtons extends React.Component {
    render() {
        return (
            <button onClick={() => { this.props.deleteBeneficiaire(this.props.beneficiaire) }}
                    className="btn btn-danger enable-pointer-events">
                    {__("Supprimer")} <i className="glyphicon glyphicon-trash"></i>
            </button>
        )
    }
}


var BeneficiairesList = React.createClass({

    getInitialState() {
        return {
            beneficiairesList: Array(),
            isModalOpen: false,
            modalBody: Array(),
            modalTitle: '',
            modalMode: '',
            btnValidateEnabled: false,
            validateLabel: '',
            resBeneficiaire: '',
            valueBeneficiaire: '',
            deleteBeneficiaire: '',
        }
    },

    openModal() {
        this.setState({isModalOpen: true})
    },

    hideModal() {
        this.setState({isModalOpen: false, resBeneficiaire: '', valueBeneficiaire: '', btnValidateEnabled: false})
    },

    getModalElements(modalMode, beneficiaire=null) {
        if (modalMode == 'post') {
            if (_.isEmpty(this.state.resBeneficiaire)) {
                var spanResBeneficiaires = <span>{__("Aucun résultat")}</span>
            }
            else {
                var spanResBeneficiaires = <span>{this.state.resBeneficiaire.label}</span>
            }

            var modalBody = (
                <form>
                    <div className="form-group row" key="search">
                        <label htmlFor="search" className="col-sm-5">{__("Recherche par n° de compte")} :</label>
                        <div className="col-sm-6">
                            <input type="text" name="search" id="search" value={this.state.valueBeneficiaire}
                                   className="form-control search-beneficiaire"
                                   onChange={this.searchBeneficiaires}>
                            </input>
                        </div>
                    </div>
                    <div className="form-group row" key="results">
                        <label className="col-sm-5">{__("Résultat")} :</label>
                        <div className="col-sm-6">
                            {spanResBeneficiaires}
                        </div>
                    </div>
                </form>
            )

            var modalTitle = __("Ajout d'un bénéficiaire")
            var validateLabel = __("Valider")
        }
        else if (modalMode == 'delete') {
            var modalBody = <p>{__("Voulez-vous supprimer le bénéficiaire") + " " + beneficiaire.cyclos_name + " ?"}</p>
            var modalTitle = __("Suppression d'un bénéficiaire")
            var validateLabel = __("Supprimer")

            this.setState({deleteBeneficiaire: beneficiaire, btnValidateEnabled: true})
        }
        this.setState({modalBody: modalBody, modalMode: modalMode,
                       modalTitle: modalTitle, validateLabel: validateLabel}, this.openModal)
    },

    searchBeneficiaires(event) {
        if (event.target.value.length == 9) {
            var promiseError = (err) => {
                this.setState({resBeneficiaire: '', valueBeneficiaire: ''})
            }

            this.setState({valueBeneficiaire: event.target.value})

            var searchBeneficiairesList = (data) => {
                // Calling this.postBeneficiaire again force modal child component to re-render
                this.setState({resBeneficiaire: data, btnValidateEnabled: true}, this.postBeneficiaire)
            }
            fetchAuth(getAPIBaseURL + "beneficiaires/search/?number=" + event.target.value,
                      'GET', searchBeneficiairesList, null, promiseError)
        }
        else {
            this.setState({resBeneficiaire: '',
                           valueBeneficiaire: event.target.value,
                           btnValidateEnabled: false}, this.postBeneficiaire)
        }
    },

    submitForm() {
        var promiseError = (err) => {
            // Error during request, or parsing NOK :(
            this.hideModal()
            console.error(this.props.url, err)
            this.refs.container.error(
                __("Une erreur s'est produite lors de l'enregistrement !"),
                "",
                {
                    timeOut: 5000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }

        if (this.state.modalMode == 'post' && !_.isEmpty(this.state.resBeneficiaire)) {
            var formData = {owner: window.config.userName, cyclos_id: this.state.resBeneficiaire.id,
                            cyclos_name: this.state.resBeneficiaire.label, cyclos_account_number: this.state.valueBeneficiaire}

            fetchAuth(this.props.beneficiairesUrl, this.state.modalMode, this.computeBeneficiairesList, formData, promiseError)
        }
        else if (this.state.modalMode == 'delete') {
            fetchAuth(this.props.beneficiairesUrl + this.state.deleteBeneficiaire.id + "/", this.state.modalMode, this.computeBeneficiairesList, formData, promiseError)
        }

        this.setState({resBeneficiaire: '', valueBeneficiaire: '', btnValidateEnabled: false})
    },

    postBeneficiaire() {
        this.getModalElements('post')
    },

    deleteBeneficiaire(beneficiaire) {
        this.getModalElements('delete', beneficiaire)
    },

    computeBeneficiairesList() {
        var getBeneficiairesList = (data) => {
            // Get beneficiairesList
            this.setState({beneficiairesList: _.sortBy(data.results, 'cyclos_name')}, this.hideModal)
        }
        fetchAuth(this.props.beneficiairesUrl, 'GET', getBeneficiairesList)
    },

    componentDidMount() {
        this.computeBeneficiairesList()
    },

    render() {
        const options = {
            sizePerPage: 20,
            hideSizePerPage: true,
            noDataText: __("Aucun bénéficiaire enregistré."),
        }

        const selectRowProp = {
            mode: 'radio',
            hideSelectColumn: true,
            clickToSelect: true,
            onSelect: (row, isSelected, event) => {
                // We want to disable click on cell #2 (the third one, which is our delete button)
                if (event.target.localName == "button" || event.target.localName == "i" || event.target.cellIndex == 2) {
                    return false
                }
                else {
                    // window.location.assign(this.props.beneficiairesUrl + row.login)
                }
            }
        }

        var buttonFormatter = (cell, row) => {
            return (
                <BeneficiairesButtons beneficiaire={row} url={this.props.beneficiairesUrl} deleteBeneficiaire={this.deleteBeneficiaire} />
            )
        }

        var beneficiairesListTable = (
            <BootstrapTable data={this.state.beneficiairesList} striped={true} hover={true}
                            search={true} searchPlaceholder={__("Rechercher un bénéficiaire")}
                            pagination={true} selectRow={selectRowProp} options={options}
                            tableContainerClass="react-bs-table-list-beneficiaires"
            >
                <TableHeaderColumn isKey={true} hidden={true} dataField="id">{__("ID")}</TableHeaderColumn>
                <TableHeaderColumn dataField="cyclos_name">{__("Nom")}</TableHeaderColumn>
                <TableHeaderColumn dataField="cyclos_account_number" width="350px">{__("N° de Compte")}</TableHeaderColumn>
                <TableHeaderColumn dataField="delete" columnClassName="disable-pointer-events" width="150px"
                                   dataFormat={buttonFormatter}>{__("Supprimer")}</TableHeaderColumn>
            </BootstrapTable>
        )

        return (
            <div className="row">
                <div className="row margin-bottom">
                    <div className="col-md-2 col-md-offset-1">
                        <button type="button" className="btn btn-success" onClick={this.postBeneficiaire}>
                            {__("Nouveau Bénéficiaire")} <i className="margin-left plus-sign glyphicon glyphicon-plus-sign"></i>
                        </button>
                    </div>
                </div>
                <div className="row">
                    <div className="col-md-9 col-md-offset-1 search-results">
                        {beneficiairesListTable}
                    </div>
                </div>
                <ToastContainer ref="container"
                                toastMessageFactory={ToastMessageFactory}
                                className="toast-top-right toast-top-right-navbar" />
                <ModalEusko hideModal={this.hideModal}
                            isModalOpen={this.state.isModalOpen}
                            modalBody={this.state.modalBody}
                            modalTitle={this.state.modalTitle}
                            validateLabel={this.state.validateLabel}
                            onValidate={this.submitForm}
                            staticContent={this.state.modalMode == 'post' ? true : false}
                            btnValidateClass={this.state.modalMode == 'post' ? "btn-success" : "btn-danger"}
                            btnValidateEnabled={this.state.btnValidateEnabled}
                            searchBeneficiaires={this.searchBeneficiaires}
                            valueBeneficiaire={this.state.valueBeneficiaire}
                            resBeneficiaire={this.state.resBeneficiaire}
                            />
            </div>
        )
    }
})


ReactDOM.render(
    <BeneficiairesList beneficiairesUrl={getAPIBaseURL + "beneficiaires/"} />,
    document.getElementById('beneficiaires')
)
document.title = __("Mes virements") + ": " + __("Gestion des bénéficiaires") + " - " + __("Compte en ligne") + " " + document.title