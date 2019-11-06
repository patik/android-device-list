import React from 'react'
import ReactDOM from 'react-dom'

import { sampleLogs, sampleDeviceList } from './sample'

import './styles.css'
import '../node_modules/bootstrap/dist/css/bootstrap.min.css'

const getUniqueElements = arr => {
    const unique = []
    const names = []

    arr.forEach(x => {
        if (!names.includes(x.sortName)) {
            names.push(x.sortName)
            unique.push(x)
        }
    })

    return unique
}

class App extends React.PureComponent {
    state = {
        data: sampleLogs,
        devices: sampleDeviceList,
    }

    onLogsChange = evt => {
        const newState = { ...this.state }

        this.setState({
            ...newState,
            data: evt.target.value.trim(),
        })
    }

    onDevicesChange = evt => {
        const newState = { ...this.state }

        this.setState({
            ...newState,
            devices: evt.target.value.trim(),
        })
    }

    getDeviceList = rawDeviceList => {
        const devices = {}
        const groups = {}

        if (rawDeviceList) {
            rawDeviceList.split('\n').forEach(desc => {
                const [brand, name, code, model] = desc.split(',')

                if (!name) {
                    return
                }

                const sortName = name.replace(/\W+/g, '_').toLowerCase()

                if (!groups[sortName]) {
                    groups[sortName] = {
                        brand,
                        codes: [code],
                        count: 0,
                    }
                } else {
                    groups[sortName].codes = groups[sortName].codes.concat([code])
                }

                devices[code] = {
                    brand,
                    name,
                    sortName,
                    model,
                    code,
                    count: 0,
                }
            })
        }

        return { groups, devices }
    }

    /**
     * Group:
     * [codeName]: {
     *     codes: Array<String>,
     *     count: Number,
     * }
     *
     * Device:
     * [codeName]: {
     *     count: Number,
     *     brand: String,
     *     name: String,
     *     model: String,
     *     codeName: String,
     * }
     */

    getResults = (data, rawDeviceList) => {
        const { devices, groups: groupsObj } = this.getDeviceList(rawDeviceList)
        let total = 0

        if (!data) {
            return { devices, total, groups: groupsObj }
        }

        // Reset the counts (why?)
        for (let device in devices) {
            if (devices.hasOwnProperty(device)) {
                devices[device].count = 0
            }
        }

        // Parse
        data.split('\n').forEach(entry => {
            const parts = entry.split(',')
            const code = parts[2]
            const installs = parts[9]

            // Ignore header row in CSV
            if (isNaN(installs)) {
                return
            }

            const numInstalls = parseInt(installs, 10)

            if (devices[code]) {
                devices[code].count += numInstalls
            } else {
                devices[code] = {
                    brand: 'Unknown',
                    name: 'Unknown',
                    sortName: 'Unknown',
                    model: 'Unknown',
                    count: numInstalls,
                }
            }

            total += numInstalls
        })

        // Reset the counts (why?)
        for (let group in groupsObj) {
            if (groupsObj.hasOwnProperty(group)) {
                groupsObj[group].count = 0
            }
        }

        // Loop through devices, then increment its group's count
        for (let d in devices) {
            if (devices.hasOwnProperty(d)) {
                const device = devices[d]

                if (groupsObj[device.sortName]) {
                    groupsObj[device.sortName].count += device.count
                }
            }
        }

        // Convert groups to array
        let groups = []

        for (let group in groupsObj) {
            // We need to filter by count because the list includes all possible devices, not just ones we've seen
            if (groupsObj.hasOwnProperty(group) && groupsObj[group].count > 0) {
                groups.push({
                    ...groupsObj[group],
                })
            }
        }

        // Filter and sort
        groups = groups.sort((a, b) => {
            if (a.count > b.count) {
                return -1
            }

            if (a.count < b.count) {
                return 1
            }

            return 0
        })

        return { devices, total, groups }
    }

    render() {
        let { devices, total, groups } = this.getResults(this.state.data, this.state.devices)
        let runningTotal = 0

        return (
            <div className="App">
                <p>
                    <textarea onChange={this.onLogsChange} defaultValue={this.state.data} />
                    <textarea onChange={this.onDevicesChange} defaultValue={this.state.devices} />
                </p>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Brand</th>
                            <th>Major Model</th>
                            <th>Installs</th>
                            <th>Running total</th>
                            <th>Running %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groups.map((group, g) => {
                            runningTotal += group.count

                            return (
                                <tr key={`${group.name}_${group.count}_${runningTotal}`}>
                                    <td>{g + 1}</td>
                                    <td>{group.brand}</td>
                                    <td>
                                        {getUniqueElements(
                                            group.codes.map(model => ({
                                                name: devices[model].name,
                                                sortName: devices[model].sortName,
                                            })),
                                        )
                                            .map(model => model.name)
                                            .join(', ')}
                                    </td>
                                    <td>{group.count}</td>
                                    <td>{runningTotal}</td>
                                    <td>{parseInt((runningTotal / total) * 100, 10)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        )
    }
}

const rootElement = document.getElementById('root')

ReactDOM.render(<App />, rootElement)
