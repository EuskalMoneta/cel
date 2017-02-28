import {
    fetchAuth,
    titleCase,
    getAPIBaseURL,
} from 'Utils'

const {
    Input,
    Row
} = FRC

import {
    BootstrapTable,
    TableHeaderColumn,
} from 'react-bootstrap-table'
import 'node_modules/react-bootstrap-table/dist/react-bootstrap-table.min.css'
const {
    ToastContainer,
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)
const HistoricalForm = React.createClass({

    mixins: [FRC.ParentContextMixin],

    propTypes: {
        children: React.PropTypes.node
    },

    render() {
        return (
            <Formsy.Form
                className={this.getLayoutClassName()}
                {...this.props}
                ref="historical-form"
            >
                {this.props.children}
            </Formsy.Form>
        );
    }
})

class EuskoKartButtons extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            buttonEnabled: props.buttonEnabled,
        }
    }

    componentWillReceiveProps(nextProps) {
        this.setState(nextProps)
    }

    blockEuskoKart(euskokart_id) {
        this.props.disableButton()

        var lockEuskoKartQuery = (data) => {
            this.props.getEuskoKartList()
        }
        fetchAuth(getAPIBaseURL + "euskokart-block/?id=" + euskokart_id, 'GET', lockEuskoKartQuery)
    }

    unlockEuskoKart(euskokart_id) {
        this.props.disableButton()

        var unlockEuskoKartQuery = (data) => {
            this.props.getEuskoKartList()
        }
        fetchAuth(getAPIBaseURL + "euskokart-unblock/?id=" + euskokart_id, 'GET', unlockEuskoKartQuery)
    }

    render() {
        if (this.props.euskokart.status === 'Active') {
            if (this.state.buttonEnabled) {
                var buttonEuskoKart = (
                    <button onClick={() => { this.blockEuskoKart(this.props.euskokart.id) }}
                            className="btn btn-warning enable-pointer-events">
                            {__("Faire opposition")} <i className="glyphicon glyphicon-lock"></i>
                    </button>
                )
            }
            else {
                var buttonEuskoKart = (
                    <button onClick={() => { this.blockEuskoKart(this.props.euskokart.id) }}
                            disabled className="btn btn-warning enable-pointer-events">
                            {__("Faire opposition")} <i className="glyphicon glyphicon-lock"></i>
                    </button>
                )
            }
        }
        else {
            if (this.state.buttonEnabled) {
                var buttonEuskoKart = (
                    <button onClick={() => { this.unlockEuskoKart(this.props.euskokart.id) }}
                            className="btn btn-success enable-pointer-events">
                            {__("Débloquer")} <i className="glyphicon glyphicon-ok"></i>
                    </button>
                )
            }
            else {
                var buttonEuskoKart = (
                    <button onClick={() => { this.unlockEuskoKart(this.props.euskokart.id) }}
                            disabled className="btn btn-success enable-pointer-events">
                            {__("Débloquer")} <i className="glyphicon glyphicon-ok"></i>
                    </button>
                )
            }
        }

        return buttonEuskoKart
    }
}


var EuskoKartList = React.createClass({

    getInitialState() {
        return {
            EuskoKartList: Array(),
            buttonEnabled: true,
            pin1: undefined,
            pin2: undefined,
            samePin: true,
            lenPin: false,
            canSubmit: false,
            passwordExist: false,
            pinOld: undefined,
        }
    },

    getPin(event, value) {
        // update pin values
        if (event == "pin1")
        {
            this.setState({pin1: value})
        }
        else if (event == "pin2")
        {
            this.setState({pin2: value})
        }
        else if (event == "old_pin")
        {
            this.setState({pinOld: value})
        }
    },

    enableButton() {
        this.setState({buttonEnabled: true})
    },

    disableButton() {
        this.setState({buttonEnabled: false})
    },

    enablePinButton() {
        this.setState({canSubmit: true})
    },

    disablePinButton() {
        this.setState({canSubmit: false})
    },


    getEuskoKartList() {
        var getEuskoKartData = (data) => {
            // Get getEuskoKartList
            var EuskoKartList = _.chain(data)
                                 .map((item) => {
                                    if (item.status == 'ACTIVE')
                                        item.status = titleCase(item.status)
                                    else
                                        item.status = 'Bloquée'

                                    return item
                                 })
                                 .sortBy((item) => { return item.status })
                                 .value()
            
            this.setState({EuskoKartList: EuskoKartList}, this.enableButton)
        }
        fetchAuth(this.props.EuskoKartUrl, 'GET', getEuskoKartData)
    },

    componentDidMount() {
        this.getEuskoKartList()

        var pinStatus = (data) => {
            if (data == "NEVER_CREATED") {
                this.setState({passwordExist: false})
            }
            else if (data == "ACTIVE") {
                this.setState({passwordExist: true})
            }
            else
            {
                // send error msg
            }
        }
        fetchAuth(getAPIBaseURL + 'euskokart-pin/' , 'GET', pinStatus)
    },

    submitForm() {
        this.disableButton()
        var computeForm = (data) => {
            if (data.status = 'Pin modified!')
            {
                this.refs.container.success(
                    __("Votre code a bien été modifié."),
                    "",
                    {
                        timeOut: 5000,
                        extendedTimeOut: 10000,
                        closeButton:true
                    }
                )
            }
            else if (data.status = 'Pin added!')
            {
                this.refs.container.success(
                    __("Votre code a bien été enregistré."),
                    "",
                    {
                        timeOut: 5000,
                        extendedTimeOut: 10000,
                        closeButton:true
                    }
                )
            }
        }

        var promiseError = (err) => {
            if (err.response.status == '401')
            {
                console.error(this.props.url, err)
                this.refs.container.error(
                    __("Une erreur est survenue lors de la modification de votre code !"),
                    "",
                    {
                        timeOut: 5000,
                        extendedTimeOut: 10000,
                        closeButton:true
                    }
                )
            }
            else if (err.response.status == '400')
            {
                console.error(this.props.url, err)
                this.refs.container.error(
                    __("Une erreur est survenue lors du choix de votre code !"),
                    "",
                    {
                        timeOut: 5000,
                        extendedTimeOut: 10000,
                        closeButton:true
                    }
                )
            }
            else
            {
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
        }
        var updatePin = (data) => {
            fetchAuth(getAPIBaseURL + 'euskokart-upd-pin/', 'POST', computeForm, this.state.data, promiseError)
        }
        if(this.state.passwordExist)
        {
            this.setState({data: {pin1: this.state.pin1, pin2: this.state.pin2, ex_pin: this.state.pinOld }}, updatePin)
        }
        else
        {
            this.setState({data: {pin1: this.state.pin1, pin2: this.state.pin2 }}, updatePin)
        }
    },

    render() {
        const options = {
            sizePerPage: 20,
            hideSizePerPage: true,
            noDataText: __("Aucune EuskoKart enregistrée."),
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
            }
        }

        var buttonFormatter = (cell, row) => {
            return <EuskoKartButtons euskokart={row}
                                     getEuskoKartList={this.getEuskoKartList} 
                                     enableButton={this.enableButton}
                                     disableButton={this.disableButton}
                                     buttonEnabled={this.state.buttonEnabled}
                   />
        }
        if (this.state.passwordExist)
        {
            var old_pin = (
                <Input
                    type="password"
                    name="old_pin"
                    data-eusko="changepin-old_password"
                    label={__("Code précédent")}
                    value=""
                    validations="minLength:4,maxLength:4"
                    validationErrors={{
                        minLength: __("Le pin de vos cartes doit comporter exactement 4 caractères."),
                        maxLength: __("Le pin de vos cartes doit comporter exactement 4 caractères.")
                    }}
                    elementWrapperClassName={[{'col-sm-2': false}, 'col-sm-2']}
                    onChange={this.getPin}
                    required={this.state.passwordExist}
                />
            )
        }
        else
        {
            var old_pin = null
        }

        return (
            <div className="row">
                <div className="row">
                    <div className="col-md-9 col-md-offset-1 search-results">
                        <BootstrapTable data={this.state.EuskoKartList} striped={true} hover={true}
                            selectRow={selectRowProp} options={options}
                            tableContainerClass="react-bs-table-list-euskokart"
                        >
                            <TableHeaderColumn isKey={true} hidden={true} dataField="id">{__("ID")}</TableHeaderColumn>
                            <TableHeaderColumn dataField="value">{__("Numéro de carte")}</TableHeaderColumn>
                            <TableHeaderColumn dataField="status" width="350">{__("Statut")}</TableHeaderColumn>
                            <TableHeaderColumn dataField="actions" columnClassName="disable-pointer-events" width="350"
                                               dataFormat={buttonFormatter}>{__("Action")}</TableHeaderColumn>
                        </BootstrapTable>
                    </div>
                </div>
                <div className="search-solde-group col-md-10">
                    <div className="col-md-12 col-md-offset-1">
                        <div className="search-group">
                            <div className="form-group row">
                                <div className="col-sm-3">
                                    <h4>Choisir mon code :</h4>
                                </div>
                            </div>
                            <div className="form-group row">
                                <HistoricalForm
                                onValidSubmit={this.submitForm}
                                onInvalid={this.disablePinButton}
                                onValid={this.enablePinButton}
                                ref="changepin">
                                    <fieldset>
                                        {old_pin}
                                        <Input
                                            type="password"
                                            name="pin1"
                                            data-eusko="changepin-pin1"
                                            label={__("Code (4 chiffres)")}
                                            value=""
                                            validations="equalsField:pin2,minLength:4,maxLength:4"
                                            validationErrors={{
                                                equalsField: __("Les mots de passe ne correspondent pas."),
                                                minLength: __("Le pin de vos cartes doit comporter exactement 4 caractères."),
                                                maxLength: __("Le pin de vos cartes doit comporter exactement 4 caractères.")
                                            }}
                                            elementWrapperClassName={[{'col-sm-2': false}, 'col-sm-2']}
                                            onChange={this.getPin}
                                            required
                                        />
                                        <Input
                                            type="password"
                                            name="pin2"
                                            data-eusko="changepin-pin2"
                                            label={__("Confirmer le code")}
                                            value=""
                                            validations="equalsField:pin1,minLength:4,maxLength:4"
                                            validationErrors={{
                                                equalsField: __("Les mots de passe ne correspondent pas."),
                                                minLength: __("Le pin de vos cartes doit comporter exactement 4 caractères."),
                                                maxLength: __("Le pin de vos cartes doit comporter exactement 4 caractères.")
                                            }}
                                            elementWrapperClassName={[{'col-sm-2': false}, 'col-sm-2']}
                                            onChange={this.getPin}
                                            required
                                        />
                                    </fieldset>
                                    <fieldset>
                                    <Row layout="horizontal">
                                        <input
                                            name="submit"
                                            data-eusko="changepin-submit"
                                            type="submit"
                                            defaultValue={__("Enregistrer")}
                                            className="btn btn-success "
                                            formNoValidate={true}
                                            disabled={!this.state.canSubmit}
                                        />
                                    </Row>
                                    </fieldset>
                                </HistoricalForm>
                            </div>
                        </div>
                    </div>
                </div>
                <ToastContainer ref="container"
                    toastMessageFactory={ToastMessageFactory}
                    className="toast-top-right toast-top-right-navbar"
                />
            </div>
        )
    }
})

ReactDOM.render(
    <EuskoKartList EuskoKartUrl={getAPIBaseURL + "euskokart/"} />,
    document.getElementById('euskokart')
)
document.title = __("Mes virements") + ": " + __("EuskoKart") + " - " + __("Compte en ligne") + " " + document.title