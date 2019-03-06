import {
    fetchAuth,
    titleCase,
    getAPIBaseURL,
} from 'Utils'

const {
    Input,
    Row,
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

const EuskokartPinForm = React.createClass({

    mixins: [FRC.ParentContextMixin],

    propTypes: {
        children: React.PropTypes.node
    },

    render() {
        return (
            <Formsy.Form
                className={this.getLayoutClassName()}
                {...this.props}
                ref="euskokart-pin-form"
            >
                {this.props.children}
            </Formsy.Form>
        );
    }
})

class EuskokartButtons extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            buttonEnabled: props.buttonEnabled,
        }
    }

    componentWillReceiveProps(nextProps) {
        this.setState(nextProps)
    }

    blockEuskokart(euskokart_id) {
        this.props.disableButton()

        var lockEuskokartQuery = (data) => {
            this.props.getEuskokartList()
        }
        fetchAuth(getAPIBaseURL + "euskokart-block/?id=" + euskokart_id, 'GET', lockEuskokartQuery)
    }

    unlockEuskokart(euskokart_id) {
        this.props.disableButton()

        var unlockEuskokartQuery = (data) => {
            this.props.getEuskokartList()
        }
        fetchAuth(getAPIBaseURL + "euskokart-unblock/?id=" + euskokart_id, 'GET', unlockEuskokartQuery)
    }

    render() {
        if (this.props.euskokart.status === 'Active') {
            if (this.state.buttonEnabled) {
                var buttonEuskokart = (
                    <button onClick={() => { this.blockEuskokart(this.props.euskokart.id) }}
                            className="btn btn-warning enable-pointer-events">
                            {__("Faire opposition")} <i className="glyphicon glyphicon-lock"></i>
                    </button>
                )
            }
            else {
                var buttonEuskokart = (
                    <button onClick={() => { this.blockEuskokart(this.props.euskokart.id) }}
                            disabled className="btn btn-warning enable-pointer-events">
                            {__("Faire opposition")} <i className="glyphicon glyphicon-lock"></i>
                    </button>
                )
            }
        }
        else {
            if (this.state.buttonEnabled) {
                var buttonEuskokart = (
                    <button onClick={() => { this.unlockEuskokart(this.props.euskokart.id) }}
                            className="btn btn-success enable-pointer-events">
                            {__("Débloquer")} <i className="glyphicon glyphicon-ok"></i>
                    </button>
                )
            }
            else {
                var buttonEuskokart = (
                    <button onClick={() => { this.unlockEuskokart(this.props.euskokart.id) }}
                            disabled className="btn btn-success enable-pointer-events">
                            {__("Débloquer")} <i className="glyphicon glyphicon-ok"></i>
                    </button>
                )
            }
        }

        return buttonEuskokart
    }
}


var EuskokartList = React.createClass({

    getInitialState() {
        return {
            EuskokartList: Array(),
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


    getEuskokartList() {
        var getEuskokartData = (data) => {
            // Get getEuskokartList
            var EuskokartList = _.chain(data)
                                 .map((item) => {
                                    if (item.status == 'ACTIVE')
                                        item.status = titleCase(item.status)
                                    else
                                        item.status = 'Bloquée'

                                    return item
                                 })
                                 .sortBy((item) => { return item.status })
                                 .value()
            
            this.setState({EuskokartList: EuskokartList}, this.enableButton)
        }
        fetchAuth(this.props.EuskokartUrl, 'GET', getEuskokartData)
    },

    componentDidMount() {
        this.getEuskokartList()

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
                    __("Une erreur est survenue lors de l'envoi du mail de confirmation !"),
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
            noDataText: __("Aucune euskokart enregistrée."),
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
            return <EuskokartButtons euskokart={row}
                                     getEuskokartList={this.getEuskokartList} 
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
                    validations={{
                        matchRegexp: /^\d\d\d\d$/,
                        isLength: 4,
                    }}
                    validationErrors={{
                        matchRegexp: __("Le code confidentiel doit comporter exactement 4 chiffres."),
                        isLength: __("Le code confidentiel doit comporter exactement 4 chiffres."),
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
                        <BootstrapTable data={this.state.EuskokartList} striped={true} hover={true}
                            selectRow={selectRowProp} options={options}
                            tableContainerClass="react-bs-table-list-euskokart"
                        >
                            <TableHeaderColumn isKey={true} hidden={true} dataField="id">{__("ID")}</TableHeaderColumn>
                            <TableHeaderColumn dataField="value">{__("Numéro de carte")}</TableHeaderColumn>
                            <TableHeaderColumn dataField="status" width="350px">{__("Statut")}</TableHeaderColumn>
                            <TableHeaderColumn dataField="actions" columnClassName="disable-pointer-events" width="350px"
                                               dataFormat={buttonFormatter}>{__("Action")}</TableHeaderColumn>
                        </BootstrapTable>
                    </div>
                </div>
                <div className="row">
                    <div className="col-md-9 col-md-offset-1 reduce-width">
                        <div>
                            <div className="form-group row">
                                <div className="col-sm-4">
                                    <h2 style={{marginLeft: 10}}>Choix du code confidentiel</h2>
                                </div>
                            </div>
                            <div className="form-group row">
                                <EuskokartPinForm
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
                                            validations={{
                                                equalsField: 'pin2',
                                                matchRegexp: /^\d\d\d\d$/,
                                                isLength: 4,
                                            }}
                                            validationErrors={{
                                                equalsField: __("Les codes ne correspondent pas."),
                                                matchRegexp: __("Le code confidentiel doit comporter exactement 4 chiffres."),
                                                isLength: __("Le code confidentiel doit comporter exactement 4 chiffres."),
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
                                            validations={{
                                                equalsField: 'pin1',
                                                matchRegexp: /^\d\d\d\d$/,
                                                isLength: 4,
                                            }}
                                            validationErrors={{
                                                equalsField: __("Les codes ne correspondent pas."),
                                                matchRegexp: __("Le code confidentiel doit comporter exactement 4 chiffres."),
                                                isLength: __("Le code confidentiel doit comporter exactement 4 chiffres."),
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
                                </EuskokartPinForm>
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
    <EuskokartList EuskokartUrl={getAPIBaseURL + "euskokart/"} />,
    document.getElementById('euskokart')
)
document.title = __("Mon euskokart") + " - " + __("Compte en ligne") + " " + document.title