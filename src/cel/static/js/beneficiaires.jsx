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
            <button onClick={() => { this.props.deleteBeneficiaires(this.props.id) }}
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
            formData: undefined,
            resBeneficiaire: '',
        }
    },

    openModal() {
        this.setState({isModalOpen: true})
    },

    hideModal() {
        this.setState({isModalOpen: false})
    },

    getModalElements(modalMode, id=null) {
        // var formData = {owner: , cyclos_id: , cyclos_name: , cyclos_account_number: }
        if (modalMode == 'post') {
            var modalBody = (
                <div>
                    <div className="form-group row" key="search">
                        <label htmlFor="search" className="col-sm-5">{__("Recherche par n° de compte")} :</label>
                        <div className="col-sm-6">
                            <input name='search' id="search" onChange={this.searchBeneficiaires}></input>
                        </div>
                    </div>
                    <div className="form-group row" key="results">
                        <label className="col-sm-5">{__("Résultats")} :</label>
                        <div className="col-sm-6">
                            <span>{this.state.resBeneficiaire}</span>
                        </div>
                    </div>
                </div>
            )

            var modalTitle = __("Ajout d'un bénéficiaire")
        }
        else if (modalMode == 'delete') {
            var modalBody = <p>{__("Voulez-vous supprimer le bénéficiaire") + " " + id + " ?"}</p>
            var modalTitle = __("Supprimer le bénéficiaire %%% ?").replace('%%%', id)
        }
        this.setState({modalBody: modalBody, modalMode: modalMode, modalTitle: modalTitle}, this.openModal)
    },

    searchBeneficiaires(event) {
        if (event.target.value.length > 3) {
            var promiseError = (err) => {
                debugger
                this.setState({resBeneficiaire: __("Pas trouvé.")})
            }

            var searchBeneficiairesList = (data) => {
                debugger
                this.setState({resBeneficiaire: data})
            }
            fetchAuth(getAPIBaseURL + "beneficiaires/search/?number=" + event.target.value,
                      'GET', searchBeneficiairesList, null, promiseError)
        }
    },

    handleFormData(formData) {
        this.setState({formData: formData})
    },

    submitForm() {
        var promiseError = (err) => {
            // Error during request, or parsing NOK :(

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
        fetchAuth(this.props.beneficiairesUrl, this.state.modalMode,
                  this.computeBeneficiairesList, this.state.formData, promiseError)
    },

    postBeneficiaire() {
        this.getModalElements('post')
    },

    deleteBeneficiaire(id) {
        this.getModalElements('delete', id)
    },

    computeBeneficiairesList(data=null) {
        if (data)
            debugger

        var getBeneficiairesList = (data) => {
        if (data.count > 0)
            debugger

            // Get beneficiairesList
            var beneficiairesList = _.chain(data.results)
                                     .sortBy((item) => {return item.lastname})
                                     .value()

            this.setState({beneficiairesList: beneficiairesList})
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
                debugger
                // window.location.assign(this.props.beneficiairesUrl + row.login)
            }
        }

        var buttonFormatter = (cell, row) => {
            debugger
            return (
                <BeneficiairesButtons id={row} url={this.props.beneficiairesUrl} />
            )
        }

        var beneficiairesListTable = (
            <BootstrapTable data={this.state.beneficiairesList} striped={true} hover={true}
                            search={true} searchPlaceholder={__("Rechercher un bénéficiaire")}
                            pagination={true} selectRow={selectRowProp} options={options}
                            tableContainerClass="react-bs-table-list-beneficiaires"
            >
                <TableHeaderColumn isKey={true} hidden={true} dataField="id">{__("ID")}</TableHeaderColumn>
                <TableHeaderColumn dataField="number" width="350">{__("N° de Compte")}</TableHeaderColumn>
                <TableHeaderColumn dataField="name">{__("Nom")}</TableHeaderColumn>
                <TableHeaderColumn dataField="delete" columnClassName="toto" width="150"
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
                            handleFormData={this.handleFormData}
                            onValidate={this.submitForm}
                            staticContent={this.state.modalMode == 'post' ? true : false}
                            btnValidateClass={this.state.modalMode == 'post' ? "btn-success" : "btn-danger"}
                            searchBeneficiaires={this.searchBeneficiaires}
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