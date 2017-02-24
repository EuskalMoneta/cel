import {
    fetchAuth,
    getAPIBaseURL,
    SelectizeUtils,
    isPositiveNumeric,
} from 'Utils'

const {
    Input,
    Select,
    Row,
} = FRC

Formsy.addValidationRule('isPositiveNumeric', isPositiveNumeric)

import ReactSelectize from 'react-selectize'
const SimpleSelect = ReactSelectize.SimpleSelect

import classNames from 'classnames'

const {
    ToastContainer
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)

const RechargeCompteForm = React.createClass({

    mixins: [FRC.ParentContextMixin],

    propTypes: {
        children: React.PropTypes.node
    },

    render() {
        return (
            <Formsy.Form
                className={this.getLayoutClassName()}
                {...this.props}
                ref="compte-recharger"
            >
                {this.props.children}
            </Formsy.Form>
        );
    }
});

class RechargeComptePage extends React.Component {

    constructor(props) {
        super(props);

        // Default state
        this.state = {
            canSubmit: false,
            account: Object(),
            accountList: Array(),
        }
    }

    onFieldChange = (event, value) => {
        this.setState({[event]: value})
    }

    enableButton = () => {
        this.setState({canSubmit: true})
    }

    disableButton = () => {
        this.setState({canSubmit: false})
    }

    componentDidMount() {
        var computeAccountList = (data) => {
            var res = _.chain(data.result)
                       .map(function(item){ return {label: item.number, value:item.owner.id} })
                       .sortBy(function(item){ return item.label })
                       .value()

            this.setState({accountList: res,
                           account: {label: data.result[0].number, value: data.result[0].owner.id}})
        }
        fetchAuth(getAPIBaseURL + "account-summary-adherents/", 'GET', computeAccountList)
    }

    submitForm = (data) => {
        this.setState({canSubmit: false})

        var computeForm = (data) => {
            this.setState({canSubmit: false})
            if (data.error == "User already exist!")
            {
                this.setState({invalidData: true, canSubmit: false, userExist: true})
            }
            else
            {
                if (data.member === null) {
                    // We got an error!
                    this.setState({invalidData: true, validData: false})
                }
                else {
                    // Everything is ok!
                    this.setState({validData: true, invalidData: false})   
                }
            }
        }

        var promiseError = (err) => {
            // Highlight login/password fields !
            this.setState({invalidData: true, canSubmit: false, userExist: false})
        }
        fetchNoAuth(this.props.url, this.props.method, computeForm, data, promiseError)
    }

    render = () => {

        if (this.state.accountList.length >= 0)
        {
            var accountField = (
                <div className="form-group row">
                    <label
                        className="control-label col-sm-offset-1 col-sm-3"
                        htmlFor="virement-debit">
                        {__("Compte à débiter") + " :"}
                    </label>
                    <div className="col-sm-4" style={{paddingTop: 11}} data-eusko="account-number">
                        <span>
                            {this.state.account.label ? this.state.account.label : ""}
                        </span>
                    </div>
                </div>
            )
        }
        else
        {
            var accountField = (
                <div className="form-group row">
                    <div className="col-sm-1"></div>
                    <label
                        className="control-label col-sm-2"
                        htmlFor="recharger-account">
                        {__("Compte à débiter") + " :"}
                    </label>
                    <div className="col-sm-1"></div>
                    <div className="col-sm-4 virement-debit" data-eusko="recharger-account">
                        <SimpleSelect
                            ref="select"
                            value={this.state.account}
                            options={this.state.accountList}
                            placeholder={__("Compte à débiter")}
                            theme="bootstrap3"
                            autocomplete="off"
                            onValueChange={this.debitOnValueChange}
                            renderValue={SelectizeUtils.selectizeRenderValue}
                            renderOption={SelectizeUtils.selectizeNewRenderOption}
                            onBlur={this.validateForm}
                            required
                        >
                        </SimpleSelect>
                    </div>
                </div>
            )
        }

        var divClasses = classNames({
            'has-error': this.state.invalidData,
        })

        return (
            <div>
                <div className={divClasses}>
                    <div className="row">
                        <h2 className="col-sm-offset-3 col-sm-4 margin-top-ten margin-bottom">{__("Recharger mon compte")}</h2>
                    </div>
                    <RechargeCompteForm
                        onValidSubmit={this.submitForm}
                        onInvalid={this.disableButton}
                        onValid={this.enableButton}
                        ref="compte-recharger">
                        <fieldset>
                            {accountField}
                            <Input
                                name="montant"
                                data-eusko="compte-recharger-montant"
                                value={this.state.montant ? this.state.montant : ""}
                                label={__("Montant à créditer") + " :"}
                                type="text"
                                placeholder={__("Montant")}
                                onChange={this.onFieldChange}
                                validations="isPositiveNumeric"
                                validationErrors={{
                                   isPositiveNumeric: __("Montant invalide.")
                                }}
                                // rowClassName={{'form-group row ': true}}
                                labelClassName={[{'col-sm-3': false}, 'col-sm-offset-1 col-sm-3']}
                                elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-2']}
                                required
                            />
                            
                            <Row layout="horizontal">
                                <div className="col-sm-offset-2">
                                    <button
                                        name="submit"
                                        data-eusko="compte-recharger-submit"
                                        type="submit"
                                        className="btn btn-success"
                                        formNoValidate={true}
                                        disabled={!this.state.canSubmit}>
                                            {__("Valider le rechargement")}
                                            <i style={{top: 3, marginLeft: 5}} className="glyphicon glyphicon-credit-card"></i>
                                    </button>
                                </div>
                            </Row>
                        </fieldset>
                    </RechargeCompteForm>
            </div>
            </div>
        );
    }
}


ReactDOM.render(
    <RechargeComptePage url={getAPIBaseURL + "compte-recharger/"} method="POST" />,
    document.getElementById('compte-recharger')
)
document.title = __("Mon compte") + ": " + __("Recharge mon compte") + " - " + __("Compte en ligne") + " " + document.title